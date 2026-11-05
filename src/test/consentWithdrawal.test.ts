// @vitest-environment node
import { afterAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
const db = process.env.SUPABASE_DB_URL ? postgres(process.env.SUPABASE_DB_URL, { max: 1, prepare: false, connect_timeout: 30 }) : null;
const rollback = Error('rollback');
const inTx = (fn: (sql: postgres.TransactionSql) => Promise<void>) =>
  db!.begin(fn).catch((e) => { if (e !== rollback) throw e; });

async function seed(sql: postgres.TransactionSql) {
  const [{ d }] = await sql`SELECT pg_get_functiondef('public.record_creator_withdrawal(uuid,text,text)'::regprocedure) AS d`;
  await sql.unsafe(d.replace('public.record_creator_withdrawal', 'pg_temp.record_creator_withdrawal'));
  const [{ id }] = await sql`SELECT gen_random_uuid() AS id`;
  await sql`INSERT INTO public.bunny_video_deliveries(creator_id,bucket,storage_path,source_updated_at,video_id,state)
            VALUES (${id},'vault',${id + '/bought.mp4'},now(),gen_random_uuid(),'ready')`;
  return id as string;
}

describe.skipIf(!db)('creator consent withdrawal', () => {
  afterAll(async () => { await db?.end(); });

  it.each(["DELETE FROM copy_fixture", "UPDATE copy_fixture SET state='ready'"])('blocks deleting or re-enabling a withdrawn copy: %s', async (statement) => {
    await expect(db!.begin(async (sql) => {
      const [{ d }] = await sql`SELECT pg_get_functiondef('public.keep_withdrawn_delivery_archived'::regproc) AS d`;
      await sql.unsafe(d.replace('public.', 'pg_temp.'));
      await sql.unsafe(`CREATE TEMP TABLE copy_fixture(LIKE public.bunny_video_deliveries INCLUDING DEFAULTS); CREATE TRIGGER k BEFORE UPDATE OR DELETE ON copy_fixture FOR EACH ROW EXECUTE FUNCTION pg_temp.keep_withdrawn_delivery_archived(); INSERT INTO copy_fixture(creator_id,bucket,storage_path,source_updated_at,video_id,state) VALUES (gen_random_uuid(),'vault','x/y.mp4',now(),gen_random_uuid(),'withdrawn')`);
      await sql.unsafe(statement);
    })).rejects.toThrow(/archived and cannot be changed/);
  });

  it('changes nothing when the request is invalid', async () => {
    await inTx(async (sql) => {
      const creator = await seed(sql);
      await sql`SAVEPOINT s`;
      await expect(sql`SELECT pg_temp.record_creator_withdrawal(${creator},'bogus',null)`).rejects.toThrow(/invalid kind/);
      await sql`ROLLBACK TO SAVEPOINT s`;
      const [{ state }] = await sql`SELECT state FROM public.bunny_video_deliveries WHERE creator_id=${creator}`;
      const w = await sql`SELECT 1 FROM public.creator_consent_withdrawals WHERE creator_id=${creator}`;
      expect(state).toBe('ready');
      expect(w).toHaveLength(0);
      throw rollback;
    });
  });

  it('cannot be called by signed-in users directly', async () => {
    const [{ ok }] = await db!`SELECT has_function_privilege('authenticated','public.record_creator_withdrawal(uuid,text,text)','EXECUTE') AS ok`;
    expect(ok).toBe(false);
  });
});
