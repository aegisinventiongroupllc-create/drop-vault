// @vitest-environment node
import postgres from 'postgres';
import { afterAll, describe, expect, it } from 'vitest';
const db = process.env.SUPABASE_DB_URL ? postgres(process.env.SUPABASE_DB_URL,{max:1,prepare:false,connect_timeout:30}) : null;
describe.skipIf(!db)('paid library follower rules',()=>{
 afterAll(async()=>{await db?.end();});
 it('counts unique paid unlocks, excludes hearts/free/tips and awards 100k once',async()=>{
  if(!db) throw Error('Database required');
  await db.begin(async sql=>{
   const tables=['transactions','token_purchases','creator_paid_followers','creator_paid_follower_totals','power_weeks','creator_split_settings'];
   for(const t of tables) await sql.unsafe(`CREATE TEMP TABLE ${t} (LIKE public.${t} INCLUDING ALL) ON COMMIT DROP`);
   for(const fn of ['record_paid_creator_follower','maybe_start_power_week']){
    const [r]=await sql`select pg_get_functiondef(oid) as d from pg_proc where pronamespace='public'::regnamespace and proname=${fn}`;
    let d=r.d.replace(`public.${fn}(`,`pg_temp.${fn}(`);
    for(const t of tables) d=d.replaceAll(`public.${t}`,`pg_temp.${t}`);
    await sql.unsafe(d);
   }
   await sql`CREATE TRIGGER record AFTER INSERT ON pg_temp.transactions FOR EACH ROW EXECUTE FUNCTION pg_temp.record_paid_creator_follower()`;
   await sql`CREATE TRIGGER milestone AFTER INSERT OR UPDATE ON pg_temp.creator_paid_follower_totals FOR EACH ROW EXECUTE FUNCTION pg_temp.maybe_start_power_week()`;
   const creator=crypto.randomUUID(), buyer=crypto.randomUUID(), purchase=crypto.randomUUID();
   await sql`INSERT INTO pg_temp.token_purchases(id,user_id,payment_id,tokens_credited,amount_usd,status) VALUES(${purchase},${buyer},'verified-paid',5,125,'finished')`;
   const add=async(payment:string,pid:string|null=purchase)=>sql`INSERT INTO pg_temp.transactions(buyer_id,creator_id,amount_usd,creator_share_percent,creator_share_usd,platform_share_usd,payment_id,status,purchase_id) VALUES(${buyer},${creator},20,90,18,2,${payment},'completed',${pid})`;
   await add('tip-test'); await add('unlock-free',null);
   let [count]=await sql`SELECT count(*)::int AS n FROM pg_temp.creator_paid_followers`; expect(count.n).toBe(0);
   await sql`INSERT INTO pg_temp.creator_paid_follower_totals(creator_id,followers) VALUES(${creator},99999)`;
   await add('unlock-paid'); await add('autorenew-repeat'); await add('unlock-repeat');
   [count]=await sql`SELECT count(*)::int AS n FROM pg_temp.creator_paid_followers`; expect(count.n).toBe(1);
   const [total]=await sql`SELECT followers FROM pg_temp.creator_paid_follower_totals`; expect(Number(total.followers)).toBe(100000);
   const [award]=await sql`SELECT count(*)::int AS n,min(split_creator) AS split,min(extract(epoch from ends_at-started_at)) AS seconds FROM pg_temp.power_weeks`; expect(award.n).toBe(1);expect(award.split).toBe(92);expect(Number(award.seconds)).toBe(604800);
   const [tier]=await sql`SELECT custom_vault_split FROM pg_temp.creator_split_settings`;expect(Number(tier.custom_vault_split)).toBe(.90);
   const [heart]=await sql`SELECT count(*)::int AS n FROM pg_trigger WHERE tgrelid='public.creator_hearts'::regclass AND tgfoid='public.maybe_start_power_week()'::regprocedure`;expect(heart.n).toBe(0);
  });
 });
 it('keeps one paid follower through actual renewal, retry and heart changes',async()=>{
  if(!db) throw Error('Database required');
  await db.begin(async sql=>{
   const tables=['transactions','token_purchases','creator_paid_followers','creator_paid_follower_totals','power_weeks','creator_split_settings','creator_hearts','creator_heart_totals','subscriptions','token_balances','creator_wallets','account_bans','creator_access_escrow','creator_consent_withdrawals'];
   for(const table of tables) await sql.unsafe(`CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING ALL) ON COMMIT DROP`);
   await sql.unsafe(`CREATE FUNCTION pg_temp.get_creator_library_count(uuid) RETURNS bigint LANGUAGE sql AS 'SELECT 1'`);
   for(const fn of ['record_paid_creator_follower','maybe_start_power_week','sync_creator_heart_total','consume_purchase_token','spend_access_token','renew_subscription_atomic']){
    const [row]=await sql`SELECT pg_get_functiondef(oid) AS definition FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname=${fn}`;
    let definition=row.definition.replace(`public.${fn}(`,`pg_temp.${fn}(`).replaceAll('public.consume_purchase_token','pg_temp.consume_purchase_token').replaceAll('public.spend_access_token','pg_temp.spend_access_token').replaceAll('public.get_creator_library_count','pg_temp.get_creator_library_count').replaceAll('auth.role()',"(current_setting('request.jwt.claims',true)::jsonb->>'role')").replaceAll('public.creator_split_percent(cid)','90');
    for(const table of tables) definition=definition.replaceAll(`public.${table}`,`pg_temp.${table}`);
    if(fn==='sync_creator_heart_total') definition=definition.replaceAll('hearts=creator_heart_totals.hearts+1','hearts=pg_temp.creator_heart_totals.hearts+1');
    await sql.unsafe(definition);
   }
   await sql`CREATE TRIGGER record AFTER INSERT ON pg_temp.transactions FOR EACH ROW EXECUTE FUNCTION pg_temp.record_paid_creator_follower()`;
   await sql`CREATE TRIGGER milestone AFTER INSERT OR UPDATE ON pg_temp.creator_paid_follower_totals FOR EACH ROW EXECUTE FUNCTION pg_temp.maybe_start_power_week()`;
   await sql`CREATE TRIGGER hearts AFTER INSERT OR DELETE ON pg_temp.creator_hearts FOR EACH ROW EXECUTE FUNCTION pg_temp.sync_creator_heart_total()`;
   const creator=crypto.randomUUID(),buyer=crypto.randomUUID(),purchase=crypto.randomUUID(),subscription=crypto.randomUUID();
   await sql`SELECT set_config('request.jwt.claims','{"role":"service_role"}',true)`;
   await sql`INSERT INTO pg_temp.creator_paid_follower_totals(creator_id,followers) VALUES(${creator},99999)`;
   await sql`INSERT INTO pg_temp.creator_hearts(user_id,creator_id) VALUES(${buyer},${creator})`;
   const [before]=await sql`SELECT followers,(SELECT count(*)::int FROM pg_temp.power_weeks) AS awards FROM pg_temp.creator_paid_follower_totals WHERE creator_id=${creator}`;
   expect(Number(before.followers)).toBe(99999);expect(before.awards).toBe(0);
   await sql`INSERT INTO pg_temp.token_purchases(id,user_id,payment_id,tokens_credited,tokens_remaining,amount_usd,status) VALUES(${purchase},${buyer},'verified-customer-fixture',2,1,50,'finished')`;
   const [unlock]=await sql`INSERT INTO pg_temp.transactions(buyer_id,creator_id,amount_usd,creator_share_percent,creator_share_usd,platform_share_usd,payment_id,status,purchase_id) VALUES(${buyer},${creator},20,90,18,2,'unlock-customer-fixture','completed',${purchase}) RETURNING id`;
   const checkCount=async()=>{
    const [state]=await sql`SELECT followers,(SELECT count(*)::int FROM pg_temp.creator_paid_followers WHERE creator_id=${creator} AND customer_id=${buyer}) AS customers,(SELECT count(*)::int FROM pg_temp.power_weeks WHERE creator_id=${creator}) AS awards FROM pg_temp.creator_paid_follower_totals WHERE creator_id=${creator}`;
    expect(Number(state.followers)).toBe(100000);expect(state.customers).toBe(1);expect(state.awards).toBe(1);
   };
   await checkCount();
   await sql`INSERT INTO pg_temp.subscriptions(id,customer_id,creator_id,expires_at,autorenew) VALUES(${subscription},${buyer},${creator},now()-interval '1 hour',true)`;
   await sql`INSERT INTO pg_temp.token_balances(user_id,balance) VALUES(${buyer},1)`;
   await sql`CREATE TEMP TABLE follower_old_expiry ON COMMIT DROP AS SELECT expires_at FROM pg_temp.subscriptions WHERE id=${subscription}`;
   const [renewal]=await sql`SELECT pg_temp.renew_subscription_atomic(${subscription},(SELECT expires_at FROM pg_temp.follower_old_expiry)) AS outcome`;
   expect(renewal.outcome).toBe('renewed');await checkCount();
   const [retry]=await sql`SELECT pg_temp.renew_subscription_atomic(${subscription},(SELECT expires_at FROM pg_temp.follower_old_expiry)) AS outcome`;
   expect(retry.outcome).toBe('skipped');
   await sql`DELETE FROM pg_temp.creator_hearts WHERE user_id=${buyer} AND creator_id=${creator}`;
   await checkCount();
   await sql`INSERT INTO pg_temp.creator_hearts(user_id,creator_id) VALUES(${buyer},${creator}),(${crypto.randomUUID()},${creator})`;
   await checkCount();
   const [result]=await sql`SELECT (SELECT balance FROM pg_temp.token_balances WHERE user_id=${buyer}) AS balance,(SELECT count(*)::int FROM pg_temp.transactions) AS charges,(SELECT hearts FROM pg_temp.creator_heart_totals WHERE creator_id=${creator}) AS hearts,(SELECT first_transaction_id FROM pg_temp.creator_paid_followers WHERE creator_id=${creator} AND customer_id=${buyer}) AS first_transaction,(SELECT renewal_count FROM pg_temp.subscriptions WHERE id=${subscription}) AS renewals`;
   expect(result.balance).toBe(0);expect(result.charges).toBe(2);expect(Number(result.hearts)).toBe(2);expect(result.first_transaction).toBe(unlock.id);expect(result.renewals).toBe(1);
   const [award]=await sql`SELECT split_creator,split_platform,extract(epoch FROM ends_at-started_at) AS seconds FROM pg_temp.power_weeks WHERE creator_id=${creator}`;
   expect(award.split_creator).toBe(92);expect(award.split_platform).toBe(8);expect(Number(award.seconds)).toBe(7*86400);
   const [tier]=await sql`SELECT custom_vault_split FROM pg_temp.creator_split_settings WHERE creator_id=${creator}`;
   expect(Number(tier.custom_vault_split)).toBe(.90);
  });
 });
 it('denies customer ledger writes and private follower reads',async()=>{
  if(!db) throw Error('Database required');
  for(const role of ['anon','authenticated']){
   const [r]=await db`SELECT has_table_privilege(${role},'public.transactions','INSERT') AS ledger,has_table_privilege(${role},'public.creator_paid_followers','INSERT') AS followers`;expect(r).toEqual({ledger:false,followers:false});
  }
  const [r]=await db`select relrowsecurity as secured from pg_class where oid='public.creator_paid_followers'::regclass`;expect(r.secured).toBe(true);
 });
});