// @vitest-environment node
import postgres from 'postgres';
import { afterAll, describe, expect, it } from 'vitest';
import { CLEAN_TEMP_SCHEMA_SQL } from './tempSchemaCleanup';
const db = process.env.SUPABASE_DB_URL ? postgres(process.env.SUPABASE_DB_URL, { max: 1, prepare: false, connect_timeout: 30 }) : null;
const names = ['customer_launch_waitlist','customer_waitlist_campaign','customer_waitlist_delivery','profiles','entry_passes'];
async function fixture(sql: postgres.TransactionSql) {
  await sql.unsafe(CLEAN_TEMP_SCHEMA_SQL);
  for (const name of names.slice(0, 3)) await sql.unsafe(`CREATE TEMP TABLE ${name} (LIKE public.${name} INCLUDING ALL) ON COMMIT DROP`);
  await sql.unsafe('CREATE TEMP TABLE profiles(user_id uuid,email text) ON COMMIT DROP; CREATE TEMP TABLE entry_passes(user_id uuid,status text,expires_at timestamptz) ON COMMIT DROP');
  await sql.unsafe("CREATE FUNCTION pg_temp.has_role(uuid,public.app_role) RETURNS boolean LANGUAGE sql AS 'SELECT $2::text=current_setting(''test.role'') OR $2::text=''customer'''");
  for (const fn of ['start_customer_waitlist_campaign(uuid)','customer_waitlist_campaign_batch()','my_customer_waitlist_invitation()','admin_customer_launch_waitlist(text,integer)']) {
    const [row] = await sql`SELECT pg_get_functiondef(${`public.${fn}`}::regprocedure) AS d`;
    let definition = row.d.replaceAll(`public.${fn.split('(')[0]}`, `pg_temp.${fn.split('(')[0]}`).replaceAll('public.has_role','pg_temp.has_role').replaceAll('auth.uid()',"current_setting('test.user')::uuid").replaceAll('auth.role()',"current_setting('test.auth')");
    for (const name of names) definition = definition.replaceAll(`public.${name}`, `pg_temp.${name}`);
    await sql.unsafe(definition);
  }
  await sql`SELECT set_config('test.user',${crypto.randomUUID()},true),set_config('test.role','admin',true),set_config('test.auth','authenticated',true)`;
}
describe.skipIf(!db)('private invitation campaign rules', () => {
  afterAll(async () => { await db?.end(); });
  it('denies member campaign creation and still denies a service admin before launch', async () => {
    if (!db) throw Error('Database required');
    await db.begin(async sql => {
      await fixture(sql);
      await expect(sql.savepoint(tx => tx`SELECT pg_temp.start_customer_waitlist_campaign(current_setting('test.user')::uuid)`)).rejects.toThrow('Administrator authorization required');
      await sql`SELECT set_config('test.auth','service_role',true)`;
      await expect(sql.savepoint(tx => tx`SELECT pg_temp.start_customer_waitlist_campaign(current_setting('test.user')::uuid)`)).rejects.toThrow('Customer launch has not opened');
    });
  });
  it('lists all 55 customers across pages and claims at most 25 without duplicates', async () => {
    if (!db) throw Error('Database required');
    await db.begin(async sql => {
      await fixture(sql);
      await sql.unsafe("INSERT INTO pg_temp.customer_launch_waitlist(user_id,country,language,joined_at) SELECT gen_random_uuid(),'US','en',now()-interval '1 day' FROM generate_series(1,55); INSERT INTO pg_temp.customer_waitlist_campaign(id,started_by) VALUES(true,current_setting('test.user')::uuid)");
      const [first] = await sql`SELECT pg_temp.admin_customer_launch_waitlist(NULL,0) AS r`;
      const [next] = await sql`SELECT pg_temp.admin_customer_launch_waitlist(NULL,50) AS r`;
      expect(first.r.total).toBe(55); expect(first.r.entries).toHaveLength(50); expect(next.r.entries).toHaveLength(5);
      await sql`SELECT set_config('test.auth','service_role',true)`;
      const a = await sql`SELECT * FROM pg_temp.customer_waitlist_campaign_batch()`;
      const b = await sql`SELECT * FROM pg_temp.customer_waitlist_campaign_batch()`;
      const c = await sql`SELECT * FROM pg_temp.customer_waitlist_campaign_batch()`;
      expect(a).toHaveLength(25); expect(b).toHaveLength(25); expect(c).toHaveLength(5);
      expect(new Set([...a,...b,...c].map(r => r.user_id)).size).toBe(55);
      expect(await sql`SELECT * FROM pg_temp.customer_waitlist_campaign_batch()`).toHaveLength(0);
    });
  });
  it('shows invitations only to the joined account and stops showing after paid entry', async () => {
    if (!db) throw Error('Database required');
    await db.begin(async sql => {
      await fixture(sql);
      await sql`INSERT INTO pg_temp.customer_waitlist_campaign(id,started_by) VALUES(true,current_setting('test.user')::uuid)`;
      const [empty] = await sql`SELECT pg_temp.my_customer_waitlist_invitation() AS r`; expect(empty.r.invited).toBe(false);
      await sql`INSERT INTO pg_temp.customer_launch_waitlist(user_id,country,joined_at) VALUES(current_setting('test.user')::uuid,'US',now()-interval '1 day')`;
      const [joined] = await sql`SELECT pg_temp.my_customer_waitlist_invitation() AS r`; expect(joined.r.invited).toBe(true);
      await sql`INSERT INTO pg_temp.entry_passes VALUES(current_setting('test.user')::uuid,'active',now()+interval '365 days')`;
      const [paid] = await sql`SELECT pg_temp.my_customer_waitlist_invitation() AS r`; expect(paid.r.invited).toBe(false);
    });
    const [grants] = await db`SELECT has_function_privilege('authenticated','public.start_customer_waitlist_campaign(uuid)','EXECUTE') AS start,has_table_privilege('authenticated','public.customer_waitlist_delivery','INSERT') AS write,has_function_privilege('anon','public.my_customer_waitlist_invitation()','EXECUTE') AS public_read`;
    expect(grants.start).toBe(false); expect(grants.write).toBe(false); expect(grants.public_read).toBe(false);
  });
});