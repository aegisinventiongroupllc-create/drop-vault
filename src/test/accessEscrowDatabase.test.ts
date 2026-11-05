// @vitest-environment node
import postgres from 'postgres';
import { afterAll, describe, expect, it } from 'vitest';
const db = process.env.SUPABASE_DB_URL ? postgres(process.env.SUPABASE_DB_URL,{max:1,prepare:false,connect_timeout:30}) : null;
const tables=['token_balances','token_purchases','subscriptions','profiles','creator_media','transactions','creator_access_escrow','creator_wallets','creator_consent_withdrawals','creator_withdrawal_settlements','withdrawal_customer_credits','user_permanent_library','account_bans'];
async function fixture(sql:postgres.TransactionSql) {
  for(const t of tables) await sql.unsafe(`CREATE TEMP TABLE ${t} (LIKE public.${t} INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES)`);
  await sql.unsafe(`CREATE TEMP TABLE storage_objects(bucket_id text,name text); CREATE FUNCTION pg_temp.content_is_cleared(text,text) RETURNS boolean LANGUAGE sql AS 'SELECT true'; CREATE FUNCTION pg_temp.creator_split_percent(uuid) RETURNS integer LANGUAGE sql AS 'SELECT 90'`);
  for(const name of ['consume_purchase_token','spend_access_token','unlock_creator','unlock_creator_year','buy_permanent_video','release_creator_access_escrow','settle_creator_withdrawal']) {
    const [row]=await sql`select pg_get_functiondef(p.oid) as d from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=${name}`;
    let d:string=row.d.replaceAll('public.', 'pg_temp.').replaceAll('storage.objects','pg_temp.storage_objects').replaceAll('auth.uid()',"current_setting('request.jwt.claim.sub')::uuid");
    await sql.unsafe(d);
  }
  const u=crypto.randomUUID(),c=crypto.randomUUID(),m=crypto.randomUUID();
  await sql`select set_config('request.jwt.claim.sub',${u},true)`;
  await sql`insert into pg_temp.token_balances(user_id,balance,bit_cents) values(${u},0,2800)`;
  await sql`insert into pg_temp.creator_media(id,creator_id,bucket,storage_path,title,media_type,allow_permanent_buyout) values(${m},${c},'vault','test/video','Test','video',true)`;
  await sql`insert into pg_temp.storage_objects values('vault','test/video')`;
  return {u,c,m};
}
async function isolated(fn:(sql:postgres.TransactionSql)=>Promise<void>) {
  if(!db) throw Error('Database required');
  const rollback=Error('fixture rollback');
  await db.begin(async sql=>{await fn(sql);throw rollback;}).catch(e=>{if(e!==rollback)throw e;});
}
describe.skipIf(!db)('deployed access escrow and credits',()=>{
  afterAll(async()=>{await db?.end();});
  it('100 cents unlocks, stacking adds 14 days, annual adds exactly 364, all earnings stay held',()=>isolated(async sql=>{
    const {u,c}=await fixture(sql);
    await sql`select pg_temp.unlock_creator(${c})`;
    await sql`select pg_temp.unlock_creator(${c})`;
    await sql`select pg_temp.unlock_creator_year(${c})`;
    const [r]=await sql`select (select bit_cents from pg_temp.token_balances where user_id=${u}) cents,(select count(*) from pg_temp.creator_access_escrow) periods,(select sum(creator_usd) from pg_temp.creator_access_escrow) held,(select extract(epoch from(expires_at-now()))/86400 from pg_temp.subscriptions) days,(select count(*) from pg_temp.creator_wallets) wallets`;
    expect(Number(r.cents)).toBe(0);expect(Number(r.periods)).toBe(28);expect(Number(r.held)).toBe(504);expect(Number(r.days)).toBe(392);expect(Number(r.wallets)).toBe(0);
  }));
  it('100 cents buys one video, retains 50 cents and rejects insufficient funds atomically',()=>isolated(async sql=>{
    const {u,c,m}=await fixture(sql);
    await sql`select pg_temp.unlock_creator(${c})`;
    await sql`update pg_temp.token_balances set bit_cents=150 where user_id=${u}`;
    await sql`select pg_temp.buy_permanent_video(${m})`;
    expect(Number((await sql`select bit_cents from pg_temp.token_balances`)[0].bit_cents)).toBe(50);
    expect((await sql`select * from pg_temp.user_permanent_library`)).toHaveLength(1);
    await expect(sql.savepoint(tx=>tx`select pg_temp.unlock_creator(${c})`)).rejects.toThrow('INSUFFICIENT_TOKENS');
    expect((await sql`select * from pg_temp.transactions`)).toHaveLength(2);
  }));
  it('releases only completed biweekly $18, retries cannot double release',()=>isolated(async sql=>{
    const {c}=await fixture(sql);await sql`select pg_temp.unlock_creator(${c})`;
    expect(Number((await sql`select pg_temp.release_creator_access_escrow() n`)[0].n)).toBe(0);
    await sql`update pg_temp.creator_access_escrow set starts_at=now()-interval '14 days',ends_at=now()`;
    expect(Number((await sql`select pg_temp.release_creator_access_escrow() n`)[0].n)).toBe(1);
    expect(Number((await sql`select pg_temp.release_creator_access_escrow() n`)[0].n)).toBe(0);
    expect(Number((await sql`select pending_balance from pg_temp.creator_wallets`)[0].pending_balance)).toBe(18);
  }));
  it('deletion at day 7 releases $9, forfeits $27 across current/future passes, credits 150 cents once',()=>isolated(async sql=>{
    const {u,c}=await fixture(sql);await sql`select pg_temp.unlock_creator(${c})`;await sql`select pg_temp.unlock_creator(${c})`;
    await sql`update pg_temp.creator_access_escrow set starts_at=starts_at-interval '7 days',ends_at=ends_at-interval '7 days'`;
    await sql`update pg_temp.subscriptions set expires_at=expires_at-interval '7 days'`;
    const w=crypto.randomUUID();
    await sql`select pg_temp.settle_creator_withdrawal(${w},${c})`;
    await sql`select pg_temp.settle_creator_withdrawal(${w},${c})`;
    const [r]=await sql`select (select pending_balance from pg_temp.creator_wallets) payable,(select sum(forfeited_usd) from pg_temp.creator_access_escrow) forfeited,(select bit_cents from pg_temp.token_balances where user_id=${u}) cents,(select count(*) from pg_temp.creator_withdrawal_settlements) settlements`;
    expect(Number(r.payable)).toBe(9);expect(Number(r.forfeited)).toBe(27);expect(Number(r.cents)).toBe(2750);expect(Number(r.settlements)).toBe(1);
  }));
  it('customers cannot directly release, settle or debit another wallet',async()=>{
    if(!db)throw Error('Database required');
    const [r]=await db`select has_function_privilege('authenticated','public.release_creator_access_escrow()','execute') release,has_function_privilege('authenticated','public.spend_access_token(uuid)','execute') spend,has_function_privilege('authenticated','public.settle_creator_withdrawal(uuid,uuid)','execute') settle`;
    expect(r).toEqual({release:false,spend:false,settle:false});
  });
});