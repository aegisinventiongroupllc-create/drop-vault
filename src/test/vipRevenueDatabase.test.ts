// @vitest-environment node
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
const db = process.env.SUPABASE_DB_URL ? postgres(process.env.SUPABASE_DB_URL, { max: 1, prepare: false, connect_timeout: 30 }) : null;
describe.skipIf(!db)("VIP revenue server rules", () => {
  afterAll(async () => { await db?.end(); });
  it("applies the 92% ceiling and 95% Power Week with exact expiry", async () => {
    if (!db) throw Error("Database required");
    await db.begin(async sql => {
      for (const table of ["creator_split_settings", "founding_creators", "power_weeks"]) await sql.unsafe(`CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING ALL) ON COMMIT DROP`);
      const [row] = await sql`SELECT pg_get_functiondef('public.creator_split_percent(uuid)'::regprocedure) AS d`;
      let body = row.d.replace("public.creator_split_percent(", "pg_temp.split(");
      for (const table of ["creator_split_settings", "founding_creators", "power_weeks"]) body = body.replaceAll(`public.${table}`, `pg_temp.${table}`);
      await sql.unsafe(body);
      const creator = crypto.randomUUID();
      const [standard] = await sql`SELECT pg_temp.split(${creator}) AS n`; expect(standard.n).toBe(90);
      await sql`INSERT INTO pg_temp.creator_split_settings(creator_id,vip_pass_purchased,custom_vault_split) VALUES(${creator},'ELITE_PASS',.92)`;
      const [elite] = await sql`SELECT pg_temp.split(${creator}) AS n`; expect(elite.n).toBe(92);
      await sql`INSERT INTO pg_temp.power_weeks(creator_id,milestone_followers,started_at,ends_at,split_creator,split_platform,active) VALUES(${creator},100000,now(),now()+interval '7 days',95,5,true)`;
      const [boost] = await sql`SELECT pg_temp.split(${creator}) AS n`; expect(boost.n).toBe(95);
      await sql`UPDATE pg_temp.power_weeks SET ends_at=now()`;
      const [expired] = await sql`SELECT pg_temp.split(${creator}) AS n`; expect(expired.n).toBe(92);
    });
  });
  it("recomputes Elite request shares and counteroffers and rejects paid-share changes", async () => {
    if (!db) throw Error("Database required");
    await db.begin(async sql => {
      for (const table of ["creator_split_settings", "custom_requests"]) await sql.unsafe(`CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING ALL) ON COMMIT DROP`);
      const [split] = await sql`SELECT pg_get_functiondef('public.creator_request_split_percent(uuid)'::regprocedure) AS d`;
      await sql.unsafe(split.d.replace("public.creator_request_split_percent(","pg_temp.request_split(").replaceAll("public.creator_split_settings","pg_temp.creator_split_settings"));
      const [trigger] = await sql`SELECT pg_get_functiondef('public.enforce_request_revenue_split()'::regprocedure) AS d`;
      await sql.unsafe(trigger.d.replace("public.enforce_request_revenue_split(","pg_temp.enforce_split(").replaceAll("public.creator_request_split_percent", "pg_temp.request_split"));
      await sql`CREATE TRIGGER split BEFORE INSERT OR UPDATE ON pg_temp.custom_requests FOR EACH ROW EXECUTE FUNCTION pg_temp.enforce_split()`;
      const creator = crypto.randomUUID(), customer = crypto.randomUUID(), id = crypto.randomUUID();
      await sql`INSERT INTO pg_temp.creator_split_settings(creator_id,vip_pass_purchased) VALUES(${creator},'ELITE_PASS')`;
      await sql`INSERT INTO pg_temp.custom_requests(id,creator_id,customer_id,description,amount_usd,tokens,creator_share_usd,platform_share_usd) VALUES(${id},${creator},${customer},'isolated test',100,5,999,999)`;
      const [created] = await sql`SELECT creator_share_usd,platform_share_usd FROM pg_temp.custom_requests WHERE id=${id}`;
      expect(Number(created.creator_share_usd)).toBe(90); expect(Number(created.platform_share_usd)).toBe(15);
      await sql`UPDATE pg_temp.custom_requests SET amount_usd=200 WHERE id=${id}`;
      const [counter] = await sql`SELECT creator_share_usd,platform_share_usd FROM pg_temp.custom_requests WHERE id=${id}`;
      expect(Number(counter.creator_share_usd)).toBe(180); expect(Number(counter.platform_share_usd)).toBe(25);
      await sql`UPDATE pg_temp.custom_requests SET status='paid' WHERE id=${id}`;
      await expect(sql.savepoint(tx => tx`UPDATE pg_temp.custom_requests SET creator_share_usd=1 WHERE id=${id}`)).rejects.toMatchObject({ code: "42501" });
    });
  });
  it("keeps VIP payment receipts and grants service-only", async () => {
    if (!db) throw Error("Database required");
    for (const role of ["anon","authenticated"]) {
      const [row] = await db`SELECT has_function_privilege(${role},'public.apply_verified_vip_pass(text)','EXECUTE') AS grant_pass, has_table_privilege(${role},'public.vip_pass_payment_receipts','SELECT') AS read_receipt`;
      expect(row).toMatchObject({ grant_pass: false, read_receipt: false });
    }
  });
  it("counts each pass once and refuses the 1001st pass", async () => {
    if (!db) throw Error("Database required");
    await db.begin(async sql => {
      for (const table of ["vip_pass_payment_receipts","vip_pass_inventory","creator_split_settings"]) await sql.unsafe(`CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING ALL) ON COMMIT DROP`);
      const [row] = await sql`SELECT pg_get_functiondef('public.apply_verified_vip_pass(text)'::regprocedure) AS d`;
      let body = row.d.replace("public.apply_verified_vip_pass(","pg_temp.apply_pass(").replaceAll("auth.role()", "'service_role'").replace("public.has_role(r.creator_id, 'creator'::app_role)", "true").replace("public.has_role(r.creator_id,'creator')", "true");
      for (const table of ["vip_pass_payment_receipts","vip_pass_inventory","creator_split_settings"]) body = body.replaceAll(`public.${table}`,`pg_temp.${table}`);
      await sql.unsafe(body);
      await sql`INSERT INTO pg_temp.vip_pass_inventory(id,total_passes_cap,passes_sold) VALUES(true,1000,999)`;
      const creator = crypto.randomUUID();
      await sql`INSERT INTO pg_temp.vip_pass_payment_receipts(payment_id,creator_id,pass_type,amount_usd,verified_at) VALUES('last',${creator},'ELITE_PASS',3500,now()),('extra',${crypto.randomUUID()},'PRO_PASS',1500,now())`;
      const [first] = await sql`SELECT pg_temp.apply_pass('last') AS ok`; expect(first.ok).toBe(true);
      const [again] = await sql`SELECT pg_temp.apply_pass('last') AS ok`; expect(again.ok).toBe(false);
      const [inventory] = await sql`SELECT passes_sold FROM pg_temp.vip_pass_inventory`; expect(inventory.passes_sold).toBe(1000);
      const [settings] = await sql`SELECT custom_vault_split,custom_request_split,vip_badge,priority_placement_until-vip_pass_purchased_at AS priority FROM pg_temp.creator_split_settings WHERE creator_id=${creator}`;
      expect(Number(settings.custom_vault_split)).toBe(.92); expect(Number(settings.custom_request_split)).toBe(.90); expect(settings.vip_badge).toBe(true); expect(settings.priority).toBe("30 days");
      await expect(sql.savepoint(tx => tx`SELECT pg_temp.apply_pass('extra')`)).rejects.toThrow("VIP passes sold out");
    });
  });
});