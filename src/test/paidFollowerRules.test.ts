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
   const [award]=await sql`SELECT count(*)::int AS n,min(split_creator) AS split,min(extract(epoch from ends_at-started_at)) AS seconds FROM pg_temp.power_weeks`; expect(award.n).toBe(1);expect(award.split).toBe(95);expect(Number(award.seconds)).toBe(604800);
   const [tier]=await sql`SELECT custom_vault_split FROM pg_temp.creator_split_settings`;expect(Number(tier.custom_vault_split)).toBe(.92);
   const [heart]=await sql`SELECT count(*)::int AS n FROM pg_trigger WHERE tgrelid='public.creator_hearts'::regclass AND tgfoid='public.maybe_start_power_week()'::regprocedure`;expect(heart.n).toBe(0);
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