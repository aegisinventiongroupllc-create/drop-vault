// @vitest-environment node
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { CLEAN_TEMP_SCHEMA_SQL } from "./tempSchemaCleanup";

const db = process.env.SUPABASE_DB_URL ? postgres(process.env.SUPABASE_DB_URL, { max: 1, prepare: false, connect_timeout: 30 }) : null;
describe.skipIf(!db)("private paid content reactions", () => {
  afterAll(async () => { await db?.end(); });
  it("records every emoji, replacements and removal; only the customer selection and creator counts are exposed", async () => {
    if (!db) throw new Error("Database required");
    const rollback = new Error("fixture rollback");
    await db.begin(async sql => {
      await sql.unsafe(CLEAN_TEMP_SCHEMA_SQL);
      for (const table of ["creator_media", "creator_reaction_settings", "content_emoji_reactions", "content_reaction_events", "subscriptions", "user_permanent_library", "video_early_access", "account_bans"]) {
        await sql.unsafe(`CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING DEFAULTS INCLUDING CONSTRAINTS)`);
      }
      await sql.unsafe(`CREATE UNIQUE INDEX temp_settings_key ON creator_reaction_settings(creator_id); CREATE UNIQUE INDEX temp_reaction_key ON content_emoji_reactions(media_id,customer_id);
        CREATE FUNCTION pg_temp.has_role(uuid,public.app_role) RETURNS boolean LANGUAGE sql AS $$ SELECT $2::text=current_setting('test.role') $$;
        CREATE FUNCTION pg_temp.has_active_entry_pass(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT current_setting('test.entry')='true' $$;
        CREATE FUNCTION pg_temp.content_is_cleared(text,text) RETURNS boolean LANGUAGE sql AS $$ SELECT current_setting('test.cleared')='true' $$;`);
      const functions = ["can_react_to_content", "my_reaction_setting", "set_my_reaction_setting", "content_reaction_state", "set_content_reaction", "record_content_reaction_change"];
      const rows = await sql`SELECT proname,pg_get_functiondef(oid) definition FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname=ANY(${functions})`;
      for (const name of functions) {
        const row = rows.find(r => r.proname === name);
        if (!row) throw new Error(`Missing ${name}`);
        let definition = (row.definition as string).split('auth.uid()').join("current_setting('request.jwt.claim.sub')::uuid");
        for (const object of [...functions, "creator_media", "creator_reaction_settings", "content_emoji_reactions", "content_reaction_events", "subscriptions", "user_permanent_library", "video_early_access", "account_bans", "has_role", "has_active_entry_pass", "content_is_cleared"]) definition = definition.split(`public.${object}`).join(`pg_temp.${object}`);
        await sql.unsafe(definition);
      }
      await sql.unsafe(`CREATE TRIGGER temp_reaction_history AFTER INSERT OR UPDATE OR DELETE ON content_emoji_reactions FOR EACH ROW EXECUTE FUNCTION pg_temp.record_content_reaction_change()`);
      const creator = crypto.randomUUID(), customer = crypto.randomUUID(), other = crypto.randomUUID(), media = crypto.randomUUID();
      const login = async (user: string, role: string) => { await sql`SELECT set_config('request.jwt.claim.sub',${user},true),set_config('test.role',${role},true),set_config('test.entry','true',true),set_config('test.cleared','true',true)`; };
      await sql`INSERT INTO creator_media(id,creator_id,bucket,storage_path,title,media_type,library_slot) VALUES(${media},${creator},'vault','fixture','Fixture','photo','regular')`;
      await login(creator, "creator");
      expect((await sql`SELECT pg_temp.my_reaction_setting() v`)[0].v).toBe(false);
      await sql`SELECT pg_temp.set_my_reaction_setting(true)`;
      await login(customer, "customer");
      await expect(sql.savepoint(tx => tx`SELECT pg_temp.set_content_reaction(${media},'🔥')`)).rejects.toThrow("PAID_CONTENT_ACCESS_REQUIRED");
      await expect(sql.savepoint(tx => tx`SELECT pg_temp.set_my_reaction_setting(true)`)).rejects.toThrow("CREATOR_REQUIRED");
      await sql`INSERT INTO subscriptions(customer_id,creator_id,creator_name,expires_at,status) VALUES(${customer},${creator},'Fixture',now()+interval '1 day','active')`;
      for (const emoji of ["❤️", "🔥", "😍", "👏", "✨"]) {
        const state = (await sql`SELECT pg_temp.set_content_reaction(${media},${emoji}) v`)[0].v;
        expect(state.selected).toBe(emoji);
        expect(state.counts).toBeUndefined();
        expect((await sql`SELECT pg_temp.content_reaction_state(${media}) v`)[0].v.selected).toBe(emoji);
        await login(creator, "creator");
        const owner = (await sql`SELECT pg_temp.content_reaction_state(${media}) v`)[0].v;
        expect(owner.counts).toEqual({ [emoji]: 1 });
        expect(owner.selected).toBeUndefined();
        expect(owner.customer_id).toBeUndefined();
        await login(customer, "customer");
      }
      await sql`SELECT pg_temp.set_content_reaction(${media},'✨')`;
      expect(Number((await sql`SELECT count(*) n FROM content_reaction_events`)[0].n)).toBe(5);
      await sql`SELECT pg_temp.set_content_reaction(${media},NULL)`;
      const history = await sql`SELECT previous_emoji,new_emoji FROM content_reaction_events ORDER BY recorded_at,id`;
      expect(history).toHaveLength(6);
      expect(history.some(e => e.previous_emoji === "✨" && e.new_emoji === null)).toBe(true);
      expect(Number((await sql`SELECT count(*) n FROM content_emoji_reactions`)[0].n)).toBe(0);
      await expect(sql.savepoint(tx => tx`SELECT pg_temp.set_content_reaction(${media},'bad')`)).rejects.toThrow("INVALID_EMOJI");
      await sql`UPDATE subscriptions SET expires_at=now()-interval '1 second'`;
      await expect(sql.savepoint(tx => tx`SELECT pg_temp.set_content_reaction(${media},'❤️')`)).rejects.toThrow("PAID_CONTENT_ACCESS_REQUIRED");
      await sql`UPDATE subscriptions SET expires_at=now()+interval '1 day'`;
      await sql`UPDATE creator_media SET library_slot='early_access'`;
      await expect(sql.savepoint(tx => tx`SELECT pg_temp.set_content_reaction(${media},'❤️')`)).rejects.toThrow("PAID_CONTENT_ACCESS_REQUIRED");
      await sql`INSERT INTO video_early_access(customer_id,video_id,transaction_id) VALUES(${customer},${media},${crypto.randomUUID()})`;
      expect((await sql`SELECT pg_temp.set_content_reaction(${media},'❤️') v`)[0].v.selected).toBe("❤️");
      await sql`SELECT set_config('test.cleared','false',true)`;
      await expect(sql.savepoint(tx => tx`SELECT pg_temp.set_content_reaction(${media},'🔥')`)).rejects.toThrow("PAID_CONTENT_ACCESS_REQUIRED");
      await login(other, "customer");
      expect((await sql`SELECT pg_temp.content_reaction_state(${media}) v`)[0].v).toEqual({ enabled: false, allowed: false });
      await login(creator, "creator");
      await sql`SELECT pg_temp.set_my_reaction_setting(false)`;
      await login(customer, "customer");
      await expect(sql.savepoint(tx => tx`SELECT pg_temp.set_content_reaction(${media},'🔥')`)).rejects.toThrow("REACTIONS_DISABLED");
      expect(Number((await sql`SELECT count(*) n FROM content_emoji_reactions`)[0].n)).toBe(1);
      throw rollback;
    }).catch(error => { if (error !== rollback) throw error; });
  });
  it("denies direct client writes and public reads of private records", async () => {
    if (!db) throw new Error("Database required");
    for (const role of ["anon", "authenticated"]) {
      const [grants] = await db`SELECT has_table_privilege(${role},'public.content_emoji_reactions','INSERT') insert_ok,has_table_privilege(${role},'public.content_emoji_reactions','UPDATE') update_ok,has_table_privilege(${role},'public.content_reaction_events','SELECT') history_ok`;
      expect(grants).toEqual({ insert_ok: false, update_ok: false, history_ok: false });
    }
    const policies = await db`SELECT qual FROM pg_policies WHERE schemaname='public' AND tablename='content_emoji_reactions'`;
    expect(policies).toHaveLength(1);
    expect(policies[0].qual).toContain("customer_id = auth.uid()");
  });
});