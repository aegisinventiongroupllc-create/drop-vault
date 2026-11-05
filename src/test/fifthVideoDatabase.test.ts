// @vitest-environment node
import postgres from 'postgres';
import { afterAll, describe, expect, it } from 'vitest';
const db = process.env.SUPABASE_DB_URL ? postgres(process.env.SUPABASE_DB_URL, {max:1,prepare:false,connect_timeout:30}) : null;
async function isolated(fn:(s:postgres.TransactionSql,u:string,c:string,v:string)=>Promise<void>) {
  if (!db) throw Error('Database required');
  const rollback=Error('rollback');
  await db.begin(async s => {
    for (const t of ['creator_media','video_early_access','transactions','subscriptions','creator_access_escrow','profiles','token_balances','token_purchases','account_bans','creator_consent_withdrawals']) await s.unsafe(`CREATE TEMP TABLE ${t} (LIKE public.${t} INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES)`);
    await s.unsafe(`CREATE TEMP TABLE storage_objects(bucket_id text,name text); CREATE FUNCTION pg_temp.content_is_cleared(text,text) RETURNS boolean LANGUAGE sql AS 'SELECT true'; CREATE FUNCTION pg_temp.creator_split_percent(uuid) RETURNS integer LANGUAGE sql AS 'SELECT 90'; CREATE FUNCTION pg_temp.has_role(uuid,public.app_role) RETURNS boolean LANGUAGE sql AS 'SELECT false'`);
    for (const n of ['consume_purchase_token','spend_access_token','unlock_creator','buy_fifth_video','guard_library_video_slots','fifth_video_storage_access']) {
      const [r]=await s`select pg_get_functiondef(oid) d from pg_proc where pronamespace='public'::regnamespace and proname=${n}`;
      await s.unsafe(r.d.replaceAll('public.','pg_temp.').replaceAll('storage.objects','pg_temp.storage_objects').replaceAll('auth.uid()',"current_setting('request.jwt.claim.sub')::uuid"));
    }
    await s.unsafe('CREATE TRIGGER slots BEFORE INSERT OR UPDATE ON pg_temp.creator_media FOR EACH ROW EXECUTE FUNCTION pg_temp.guard_library_video_slots()');
    const u=crypto.randomUUID(),c=crypto.randomUUID(),v=crypto.randomUUID();
    await s`select set_config('request.jwt.claim.sub',${u},true)`;
    await s`insert into pg_temp.token_balances(user_id,balance,bit_cents) values(${u},0,500)`;
    await s`insert into pg_temp.creator_media(creator_id,bucket,storage_path,title,media_type) values(${c},'vault',${c+'/regular'},'Regular','video')`;
    await s`insert into pg_temp.storage_objects values('vault',${c+'/regular'})`;
    await s`insert into pg_temp.creator_media(id,creator_id,bucket,storage_path,title,media_type,library_slot) values(${v},${c},'vault',${c+'/fifth'},'Fifth','video','early_access')`;
    await fn(s,u,c,v); throw rollback;
  }).catch(e=>{if(e!==rollback)throw e;});
}
describe.skipIf(!db)('fifth video rules',()=>{
  afterAll(async()=>{await db?.end();});
  it('allows four regular videos and one fifth, rejects extras',()=>isolated(async(s,u,c)=>{
    for(let i=1;i<4;i++) await s`insert into pg_temp.creator_media(creator_id,bucket,storage_path,title,media_type) values(${c},'vault',${c+'/'+i},'Regular','video')`;
    await expect(s.savepoint(t=>t`insert into pg_temp.creator_media(creator_id,bucket,storage_path,title,media_type) values(${c},'vault','extra','Extra','video')`)).rejects.toThrow('LIBRARY_VIDEO_LIMIT');
    await expect(s.savepoint(t=>t`insert into pg_temp.creator_media(creator_id,bucket,storage_path,title,media_type,library_slot) values(${c},'vault','extra-fifth','Extra','video','early_access')`)).rejects.toThrow('LIBRARY_VIDEO_LIMIT');
    expect((await s`select * from pg_temp.creator_media`)).toHaveLength(5);
  }));
  it('one token adds exactly 14 days to 28 days and holds $18; retries do not charge',()=>isolated(async(s,u,c,v)=>{
    await s`select pg_temp.unlock_creator(${c})`; await s`select pg_temp.unlock_creator(${c})`;
    await s`select pg_temp.buy_fifth_video(${v})`;
    const [r]=await s`select extract(epoch from(expires_at-now()))/86400 days from pg_temp.subscriptions`;
    expect(Number(r.days)).toBe(42);
    expect(Number((await s`select bit_cents from pg_temp.token_balances`)[0].bit_cents)).toBe(200);
    expect(Number((await s`select sum(creator_usd) held from pg_temp.creator_access_escrow`)[0].held)).toBe(54);
    await expect(s.savepoint(t=>t`select pg_temp.buy_fifth_video(${v})`)).rejects.toThrow('ALREADY_OWNED');
    expect((await s`select * from pg_temp.transactions`)).toHaveLength(3);
  }));
  it('regular access does not authorize the fifth, payment does; expiry locks it again',()=>isolated(async(s,u,c,v)=>{
    await s`select pg_temp.unlock_creator(${c})`;
    expect((await s`select pg_temp.fifth_video_storage_access('vault',${c+'/fifth'}) ok`)[0].ok).toBe(false);
    await s`select pg_temp.buy_fifth_video(${v})`;
    expect((await s`select pg_temp.fifth_video_storage_access('vault',${c+'/fifth'}) ok`)[0].ok).toBe(true);
    await s`update pg_temp.subscriptions set expires_at=now()-interval '1 second'`;
    expect((await s`select pg_temp.fifth_video_storage_access('vault',${c+'/fifth'}) ok`)[0].ok).toBe(false);
  }));
  it('requires active library access and preserves balances on denial',()=>isolated(async(s,u,c,v)=>{
    await expect(s.savepoint(t=>t`select pg_temp.buy_fifth_video(${v})`)).rejects.toThrow('LIBRARY_ACCESS_REQUIRED');
    expect(Number((await s`select bit_cents from pg_temp.token_balances`)[0].bit_cents)).toBe(500);
  }));
});