// @vitest-environment node
import postgres from "postgres";
import { afterAll, describe, it, expect } from "vitest";
import { CLEAN_TEMP_SCHEMA_SQL } from "./tempSchemaCleanup";
const db = process.env.SUPABASE_DB_URL ? postgres(process.env.SUPABASE_DB_URL, { max: 1, prepare: false, connect_timeout: 30 }) : null;
describe.skipIf(!db)("request menu server rules", () => {
  afterAll(async () => { await db?.end(); });
  it("does not grant anonymous menu reads or order creation", async () => {
    if (!db) throw new Error("Database required");
    const [row] = await db`SELECT has_table_privilege('anon','public.creator_request_menus','SELECT') AS read,has_function_privilege('anon','public.create_menu_request(uuid,integer,numeric,text,uuid)','EXECUTE') AS create`;
    expect(row).toEqual({ read: false, create: false });
  });
  it("validates six options and the $25 minimum on the server", async () => {
    if (!db) throw new Error("Database required");
    await db.begin(async sql => {
      await sql.unsafe(CLEAN_TEMP_SCHEMA_SQL);
      await sql`CREATE TEMP TABLE menus (LIKE public.creator_request_menus INCLUDING ALL) ON COMMIT DROP`;
      await sql`CREATE TRIGGER validate BEFORE INSERT OR UPDATE ON menus FOR EACH ROW EXECUTE FUNCTION public.validate_request_menu()`;
      const item = { title: "Custom five-minute video", description: "Personal clip", price_usd: 46, turnaround_days: 5 };
      const owner = crypto.randomUUID();
      await sql`INSERT INTO menus(creator_id,items) VALUES(${owner},${sql.json(Array(6).fill(item))})`;
      await expect(sql.savepoint(tx => tx`UPDATE menus SET items=${tx.json(Array(7).fill(item))}`)).rejects.toThrow("at most 6");
      await expect(sql.savepoint(tx => tx`UPDATE menus SET items=${tx.json([{ ...item, price_usd: 24.99 }])}`)).rejects.toThrow("at least $25");
      await expect(sql.savepoint(tx => tx`UPDATE menus SET items=${tx.json([{ ...item, turnaround_days: 0 }])}`)).rejects.toThrow("turnaround");
    });
  });
  it("snapshots $46 at 85/15, deduplicates retries, waits for verified payment, and sets a five-day deadline", async () => {
    if (!db) throw new Error("Database required");
    await db.begin(async sql => {
      await sql.unsafe(CLEAN_TEMP_SCHEMA_SQL);
      for (const table of ["creator_request_menus", "custom_requests", "custom_request_payment_receipts", "profiles"]) await sql.unsafe(`CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING ALL) ON COMMIT DROP`);
      await sql.unsafe("CREATE FUNCTION pg_temp.approved(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT coalesce(current_setting('test.approved',true),'false')='true' $$");
      await sql.unsafe("CREATE FUNCTION pg_temp.member(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT coalesce(current_setting('test.member',true),'false')='true' $$");
      await sql.unsafe("CREATE FUNCTION pg_temp.legacy_split(uuid) RETURNS integer LANGUAGE sql AS $$ SELECT 90 $$");
      const clone = async (name: string, target: string) => {
        const [row] = await sql`SELECT pg_get_functiondef(p.oid) AS d FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname=${name}`;
        let text = row.d.replace(`public.${name}(`, `pg_temp.${target}(`).replace("SECURITY DEFINER", "");
        for (const table of ["creator_request_menus", "custom_requests", "custom_request_payment_receipts", "profiles"]) text = text.replaceAll(`public.${table}`, `pg_temp.${table}`);
        text = text.replaceAll("public.request_menu_creator_approved", "pg_temp.approved").replaceAll("public.can_view_feed", "pg_temp.member");
        text = text.replaceAll("auth.uid()", "(current_setting('request.jwt.claims',true)::jsonb->>'sub')::uuid").replaceAll("auth.role()", "(current_setting('request.jwt.claims',true)::jsonb->>'role')");
        text = text.replaceAll("public.creator_request_split_percent", "pg_temp.legacy_split");
        await sql.unsafe(text);
      };
      await clone("create_menu_request", "create_order");
      await clone("enforce_request_revenue_split", "split");
      await clone("activate_paid_request_delivery", "activate");
      await clone("menu_paid_deadline", "deadline");
      await clone("mark_custom_request_paid", "mark_paid");
      await sql`CREATE TRIGGER split BEFORE INSERT OR UPDATE ON pg_temp.custom_requests FOR EACH ROW EXECUTE FUNCTION pg_temp.split()`;
      await sql`CREATE TRIGGER activate BEFORE UPDATE ON pg_temp.custom_requests FOR EACH ROW EXECUTE FUNCTION pg_temp.activate()`;
      await sql`CREATE TRIGGER zz_deadline BEFORE UPDATE ON pg_temp.custom_requests FOR EACH ROW EXECUTE FUNCTION pg_temp.deadline()`;
      const creator = crypto.randomUUID(), buyer = crypto.randomUUID(), nonce = crypto.randomUUID();
      await sql`SELECT set_config('request.jwt.claim.sub',${buyer},true),set_config('request.jwt.claims',${JSON.stringify({ sub: buyer, role: "authenticated" })},true),set_config('test.member','true',true),set_config('test.approved','false',true)`;
      await sql`INSERT INTO pg_temp.profiles(user_id,display_name) VALUES(${creator},'SyntheticCreator')`;
      await sql`INSERT INTO pg_temp.creator_request_menus(creator_id,enabled,items) VALUES(${creator},true,${sql.json([{ title: "Custom video", description: "Five minutes", price_usd: 46, turnaround_days: 5 }])})`;
      await expect(sql.savepoint(tx => tx`SELECT pg_temp.create_order(${creator},0,1,'Personal request',${nonce})`)).rejects.toMatchObject({ code: "42501" });
      await sql`SELECT set_config('test.approved','true',true)`;
      const [first] = await sql`SELECT pg_temp.create_order(${creator},0,1,'Personal request',${nonce}) AS id`;
      const [retry] = await sql`SELECT pg_temp.create_order(${creator},0,1,'Personal request',${nonce}) AS id`;
      expect(first.id).toBe(retry.id);
      const [row] = await sql`SELECT * FROM pg_temp.custom_requests WHERE id=${first.id}`;
      expect(Number(row.amount_usd)).toBe(46); expect(Number(row.creator_share_usd)).toBe(39.10); expect(Number(row.platform_share_usd)).toBe(11.90);
      expect(row.status).toBe("accepted"); expect(row.fulfillment_deadline).toBeNull(); expect(row.turnaround_days).toBe(5); expect(row.tokens).toBe(0);
      await sql`UPDATE pg_temp.creator_request_menus SET items='[]'`;
      expect((await sql`SELECT menu_snapshot FROM pg_temp.custom_requests WHERE id=${first.id}`)[0].menu_snapshot.price_usd).toBe(46);
      await expect(sql.savepoint(tx => tx`UPDATE pg_temp.custom_requests SET status='paid' WHERE id=${first.id}`)).rejects.toMatchObject({ code: "42501" });
      await sql`SELECT set_config('request.jwt.claims',${JSON.stringify({ sub: buyer, role: "service_role" })},true)`;
      await sql`INSERT INTO pg_temp.custom_request_payment_receipts(payment_id,order_id,request_id,user_id,base_usd,amount_usd,verified_at) VALUES('synthetic-paid','synthetic-order',${first.id},${buyer},46,51,now())`;
      expect((await sql`SELECT pg_temp.mark_paid(${first.id},'synthetic-paid') AS ok`)[0].ok).toBe(true);
      const [paid] = await sql`SELECT status,extract(epoch FROM fulfillment_deadline-now())/86400 AS days FROM pg_temp.custom_requests WHERE id=${first.id}`;
      expect(paid.status).toBe("paid"); expect(Number(paid.days)).toBe(5);
      expect((await sql`SELECT pg_temp.mark_paid(${first.id},'synthetic-paid') AS ok`)[0].ok).toBe(false);
      await sql`UPDATE pg_temp.creator_request_menus SET enabled=false`;
      await expect(sql.savepoint(tx => tx`SELECT pg_temp.create_order(${creator},NULL,46,'Open idea',${crypto.randomUUID()})`)).rejects.toThrow("not taking");
    });
  });
});