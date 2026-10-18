// @vitest-environment node
import {afterAll,describe,it,expect} from 'vitest';
import postgres from 'postgres';
const db=process.env.SUPABASE_DB_URL?postgres(process.env.SUPABASE_DB_URL,{max:1}):null;
describe.skipIf(!db)('deployed atomic renewals in isolated fixtures',()=>{
 afterAll(async()=>{await db?.end();});
 async function setup(sql:postgres.TransactionSql){
  const rows=await sql`SELECT pg_get_functiondef('public.renew_subscription_atomic(uuid,timestamptz)'::regprocedure) AS definition`;
  for(const table of ['subscriptions','token_balances','transactions','creator_wallets','account_bans','token_purchases']) await sql.unsafe(`CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES)`);
  await sql.unsafe(`CREATE OR REPLACE FUNCTION pg_temp.test_consume(u uuid) RETURNS uuid LANGUAGE plpgsql AS $$ DECLARE p uuid; BEGIN SELECT id INTO p FROM pg_temp.token_purchases WHERE user_id=u AND tokens_remaining>0 LIMIT 1 FOR UPDATE; UPDATE pg_temp.token_purchases SET tokens_remaining=tokens_remaining-1 WHERE id=p; RETURN p; END $$`);
  let definition=rows[0].definition.replace('public.renew_subscription_atomic(','pg_temp.test_renew(').replaceAll('auth.role()',"(current_setting('request.jwt.claims',true)::jsonb->>'role')").replaceAll('public.consume_purchase_token','pg_temp.test_consume').replaceAll('public.creator_split_percent(s.creator_id)',"current_setting('test.split')::integer");
  for(const table of ['subscriptions','token_balances','transactions','creator_wallets','account_bans'])definition=definition.replaceAll(`public.${table}`,`pg_temp.${table}`);
  await sql.unsafe(definition);
  const uid=crypto.randomUUID(),creator=crypto.randomUUID(),id=crypto.randomUUID();
  await sql`SELECT set_config('request.jwt.claims','{"role":"service_role"}',true),set_config('test.split','90',true)`;
  await sql`INSERT INTO pg_temp.subscriptions(id,customer_id,creator_id,expires_at,autorenew) VALUES(${id},${uid},${creator},now()-interval '1 hour',true)`;
  await sql`INSERT INTO pg_temp.token_balances(user_id,balance) VALUES(${uid},2)`;
  await sql`INSERT INTO pg_temp.token_purchases(user_id,payment_id,tokens_credited,tokens_remaining,amount_usd) VALUES(${uid},${crypto.randomUUID()},2,2,50)`;
  return {uid,creator,id};
 }
 const fixture=async(fn:(sql:postgres.TransactionSql,f:{uid:string;creator:string;id:string})=>Promise<void>)=>{
  if(!db)throw Error('Database required');const rollback=new Error('rollback');
  await db.begin(async sql=>{const f=await setup(sql);await fn(sql,f);throw rollback;}).catch(e=>{if(e!==rollback)throw e;});
 };
 it.each(['anon','authenticated'])('denies %s callers',async role=>{
  if(!db)throw Error('Database required');const r=await db`SELECT has_function_privilege(${role},'public.renew_subscription_atomic(uuid,timestamptz)','EXECUTE') AS allowed`;expect(r[0].allowed).toBe(false);
 });
 it('enforces authorization inside the function',()=>fixture(async(sql,f)=>{
  await sql`SELECT set_config('request.jwt.claims','{"role":"authenticated"}',true)`;
  await expect(sql.savepoint(tx=>tx`SELECT pg_temp.test_renew(${f.id},(SELECT expires_at FROM pg_temp.subscriptions WHERE id=${f.id}))`)).rejects.toMatchObject({code:'42501'});
 }));
 it.each([90,92,95])('records eligible %i percent split and exactly 14 days once',split=>fixture(async(sql,f)=>{
  await sql`SELECT set_config('test.split',${String(split)},true)`;
  const old=await sql`SELECT expires_at FROM pg_temp.subscriptions WHERE id=${f.id}`;
  const first=await sql`SELECT pg_temp.test_renew(${f.id},${old[0].expires_at}) AS outcome`;
  const again=await sql`SELECT pg_temp.test_renew(${f.id},${old[0].expires_at}) AS outcome`;
  expect(first[0].outcome).toBe('renewed');expect(again[0].outcome).toBe('skipped');
  const state=await sql`SELECT balance,(SELECT count(*) FROM pg_temp.transactions) AS count,(SELECT creator_share_usd FROM pg_temp.transactions LIMIT 1) AS cut,(SELECT extract(epoch FROM expires_at-now()) FROM pg_temp.subscriptions WHERE id=${f.id}) AS seconds,(SELECT renewal_count FROM pg_temp.subscriptions WHERE id=${f.id}) AS renewals FROM pg_temp.token_balances WHERE user_id=${f.uid}`;
  expect(state[0].balance).toBe(1);expect(Number(state[0].count)).toBe(1);expect(Number(state[0].cut)).toBe(20*split/100);expect(Number(state[0].seconds)).toBe(14*86400);expect(state[0].renewals).toBe(1);
 }));
 it('does not charge insufficient balance',()=>fixture(async(sql,f)=>{
  await sql`UPDATE pg_temp.token_balances SET balance=0 WHERE user_id=${f.uid}`;
  const r=await sql`SELECT pg_temp.test_renew(${f.id},(SELECT expires_at FROM pg_temp.subscriptions WHERE id=${f.id})) AS outcome`;expect(r[0].outcome).toBe('insufficient_tokens');const t=await sql`SELECT count(*) FROM pg_temp.transactions`;expect(Number(t[0].count)).toBe(0);
 }));
 it('rolls back deductions when purchase attribution fails',()=>fixture(async(sql,f)=>{
  await sql`DELETE FROM pg_temp.token_purchases`;
  await expect(sql.savepoint(tx=>tx`SELECT pg_temp.test_renew(${f.id},(SELECT expires_at FROM pg_temp.subscriptions WHERE id=${f.id}))`)).rejects.toThrow('Missing token purchase attribution');
  const r=await sql`SELECT balance FROM pg_temp.token_balances WHERE user_id=${f.uid}`;expect(r[0].balance).toBe(2);
 }));
 it('does not charge future or opted-out subscriptions',()=>fixture(async(sql,f)=>{
  await sql`UPDATE pg_temp.subscriptions SET expires_at=now()+interval '1 day' WHERE id=${f.id}`;
  const r=await sql`SELECT pg_temp.test_renew(${f.id},(SELECT expires_at FROM pg_temp.subscriptions WHERE id=${f.id})) AS outcome`;expect(r[0].outcome).toBe('skipped');
  await sql`UPDATE pg_temp.subscriptions SET expires_at=now()-interval '1 day',autorenew=false WHERE id=${f.id}`;
  const off=await sql`SELECT pg_temp.test_renew(${f.id},(SELECT expires_at FROM pg_temp.subscriptions WHERE id=${f.id})) AS outcome`;expect(off[0].outcome).toBe('skipped');
 }));
});
