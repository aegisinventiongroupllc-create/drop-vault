// @vitest-environment node
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { CLEAN_TEMP_SCHEMA_SQL } from "./tempSchemaCleanup";

const db = process.env.SUPABASE_DB_URL ? postgres(process.env.SUPABASE_DB_URL, { max: 1, prepare: false, connect_timeout: 30 }) : null;
const tables = ["year_end_award_reviews", "year_end_award_candidates", "creator_lifetime_awards", "profiles", "creator_verifications", "creator_paid_followers", "account_bans", "creator_consent_withdrawals", "creator_split_settings", "power_weeks", "founding_creators"];

describe.skipIf(!db)("year-end lifetime country awards", () => {
  afterAll(async () => { await db?.end(); });
  const isolated = async (run: (sql: postgres.TransactionSql) => Promise<void>) => {
    if (!db) throw new Error("Database required");
    await db.begin(async sql => {
    await sql.unsafe(CLEAN_TEMP_SCHEMA_SQL);
      for (const table of tables) await sql.unsafe(`CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING ALL) ON COMMIT DROP`);
      await sql`CREATE TEMP TABLE test_roles(user_id uuid, role text) ON COMMIT DROP`;
      await sql`CREATE OR REPLACE FUNCTION pg_temp.has_role(id uuid, wanted public.app_role) RETURNS boolean LANGUAGE sql AS 'SELECT EXISTS(SELECT 1 FROM pg_temp.test_roles WHERE user_id=id AND role=wanted::text)'`;
      for (const name of ["prepare_year_end_awards", "confirm_year_end_award", "creator_split_percent", "creator_request_split_percent", "get_my_revenue_terms"]) {
        const [row] = await sql`SELECT pg_get_functiondef(oid) AS definition FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname=${name}`;
        let body = row.definition.replace(`public.${name}(`, `pg_temp.${name}(`).replaceAll("auth.uid()", "nullif(current_setting('test.actor',true),'')::uuid").replaceAll("public.has_role", "pg_temp.has_role").replaceAll("public.creator_split_percent", "pg_temp.creator_split_percent").replaceAll("public.creator_request_split_percent", "pg_temp.creator_request_split_percent").replaceAll("public.year_end_award_candidates", "pg_temp.year_end_award_candidates");
        for (const table of tables) body = body.replaceAll(`public.${table}`, `pg_temp.${table}`);
        // Exercise the completed 2026 year without changing the real clock or any account.
        body = body.replaceAll("now()", "'2027-01-02T00:00:00Z'::timestamptz");
        await sql.unsafe(body);
      }
      await run(sql);
    });
  };
  const admin = crypto.randomUUID();
  const setup = async (sql: postgres.TransactionSql) => {
    await sql`INSERT INTO pg_temp.test_roles VALUES(${admin},'admin')`;
    await sql`SELECT set_config('test.actor',${admin},true)`;
  };
  const creator = async (sql: postgres.TransactionSql, country: string, paid: number, suffix = "", verified = true) => {
    const id = crypto.randomUUID();
    await sql`INSERT INTO pg_temp.test_roles VALUES(${id},'creator')`;
    await sql`INSERT INTO pg_temp.profiles(user_id,display_name,country,created_at) VALUES(${id},${`creator_${suffix || id.slice(0,8)}`},'GB','2026-01-01')`;
    await sql`INSERT INTO pg_temp.creator_verifications(user_id,legal_first_name,legal_last_name,date_of_birth,id_front_path,id_back_path,selfie_path,status,identity_confirmed,residence_country,residence_id_confirmed,residence_reviewed_by,residence_reviewed_at,reviewed_at,document_expires_on) VALUES(${id},'Test','Only','1990-01-01','x','x','x','approved',true,${country},${verified},${admin},'2026-01-01','2026-01-01','2028-01-01')`;
    if (paid > 0) await sql`INSERT INTO pg_temp.creator_paid_followers(creator_id,customer_id,first_transaction_id,first_paid_at) SELECT ${id}::uuid,gen_random_uuid(),gen_random_uuid(),'2026-12-31T23:59:59Z'::timestamptz FROM generate_series(1,${paid})`;
    return id;
  };

  it("ranks cumulative unique paid followers at the UTC cutoff, combines vaults, preserves ties, and excludes unverified/blocked/zero-follower creators", async () => {
    await isolated(async sql => {
      await setup(sql);
      const top = await creator(sql,"US",3,"top"), tie = await creator(sql,"US",3,"tie"), low = await creator(sql,"US",2,"lower"), other = await creator(sql,"CA",1,"other");
      await sql`UPDATE pg_temp.profiles SET vault_side='men' WHERE user_id=${tie}`;
      // A follower first gained in an earlier year still counts toward year-end total.
      await sql`UPDATE pg_temp.creator_paid_followers SET first_paid_at='2025-12-01' WHERE creator_id=${other}`;
      await sql`INSERT INTO pg_temp.creator_paid_followers VALUES(${low},${crypto.randomUUID()},${crypto.randomUUID()},'2027-01-01T00:00:00Z')`;
      await creator(sql,"US",100,"unverified",false); await creator(sql,"JP",100,"blocked"); await creator(sql,"GB",0,"zero");
      await sql`SELECT pg_temp.prepare_year_end_awards(2026)`;
      const rows = await sql`SELECT country,creator_id,followers FROM pg_temp.year_end_award_candidates ORDER BY country,creator_id`;
      expect(rows.map(r=>r.creator_id).sort()).toEqual([top,tie,other].sort());
      expect(rows.filter(r=>r.country==='US').map(r=>Number(r.followers))).toEqual([3,3]);
      const [review] = await sql`SELECT excluded_country_count FROM pg_temp.year_end_award_reviews`; expect(review.excluded_country_count).toBe(1);
      const [awards] = await sql`SELECT count(*) AS n FROM pg_temp.creator_lifetime_awards`; expect(Number(awards.n)).toBe(0);
    });
  });
  it("does not prepare an incomplete year and does not allow non-admin preparation or confirmation", async () => {
    await isolated(async sql => {
      await setup(sql);
      await expect(sql.savepoint(tx=>tx`SELECT pg_temp.prepare_year_end_awards(2027)`)).rejects.toThrow("Only completed years");
      await sql`SELECT set_config('test.actor',${crypto.randomUUID()},true)`;
      await expect(sql.savepoint(tx=>tx`SELECT pg_temp.prepare_year_end_awards(2026)`)).rejects.toMatchObject({code:"42501"});
      await expect(sql.savepoint(tx=>tx`SELECT pg_temp.confirm_year_end_award(2026,'US',${crypto.randomUUID()})`)).rejects.toMatchObject({code:"42501"});
    });
  });
  it("freezes review results and requires confirmation; selects only a leader and permits one winner per country/year with idempotent retries", async () => {
    await isolated(async sql => {
      await setup(sql);
      const a=await creator(sql,"US",2), b=await creator(sql,"US",2), low=await creator(sql,"US",1);
      await sql`SELECT pg_temp.prepare_year_end_awards(2026)`;
      await expect(sql.savepoint(tx=>tx`SELECT pg_temp.confirm_year_end_award(2026,'US',${low})`)).rejects.toThrow("not a year-end country leader");
      await sql`INSERT INTO pg_temp.creator_paid_followers VALUES(${low},${crypto.randomUUID()},${crypto.randomUUID()},'2026-12-01')`;
      const [prepared] = await sql`SELECT pg_temp.prepare_year_end_awards(2026) AS result`; expect(prepared.result.already_prepared).toBe(true);
      const [n] = await sql`SELECT count(*) AS n FROM pg_temp.year_end_award_candidates`; expect(Number(n.n)).toBe(2);
      const [before] = await sql`SELECT pg_temp.creator_split_percent(${a}) AS n`; expect(before.n).toBe(90);
      await sql`SELECT pg_temp.confirm_year_end_award(2026,'US',${a})`;
      const [again] = await sql`SELECT pg_temp.confirm_year_end_award(2026,'US',${a}) AS result`; expect(again.result.already_confirmed).toBe(true);
      await expect(sql.savepoint(tx=>tx`SELECT pg_temp.confirm_year_end_award(2026,'US',${b})`)).rejects.toThrow("already has a confirmed winner");
      const [award] = await sql`SELECT * FROM pg_temp.creator_lifetime_awards`; expect(award.confirmed_by).toBe(admin); expect(Number(award.followers)).toBe(2);
    });
  });
  it("requires independent approval and rejects a creator banned after preparation", async () => {
    await isolated(async sql => {
      await setup(sql); const a=await creator(sql,"US",1);
      await sql`SELECT pg_temp.prepare_year_end_awards(2026)`;
      await sql`INSERT INTO pg_temp.test_roles VALUES(${a},'admin')`; await sql`SELECT set_config('test.actor',${a},true)`;
      await expect(sql.savepoint(tx=>tx`SELECT pg_temp.confirm_year_end_award(2026,'US',${a})`)).rejects.toMatchObject({code:"42501"});
      await sql`SELECT set_config('test.actor',${admin},true)`;
      await sql`INSERT INTO pg_temp.account_bans(user_id,reason,tokens_revoked) VALUES(${a},'isolated',0)`;
      await expect(sql.savepoint(tx=>tx`SELECT pg_temp.confirm_year_end_award(2026,'US',${a})`)).rejects.toThrow("no longer eligible");
    });
  });
  it("awards 95/5 for life above Elite, founding and Power Week; preserves custom requests and exposes own award status", async () => {
    await isolated(async sql => {
      await setup(sql); const a=await creator(sql,"US",1);
      await sql`INSERT INTO pg_temp.creator_split_settings(creator_id,vip_pass_purchased) VALUES(${a},'ELITE_PASS')`;
      await sql`INSERT INTO pg_temp.founding_creators(creator_id,country,vault_side,slot,split_creator,split_platform,ends_at) VALUES(${a},'US','women',1,91,9,'9999-12-31')`;
      await sql`INSERT INTO pg_temp.power_weeks(creator_id,milestone_followers,started_at,ends_at,split_creator,split_platform,active) VALUES(${a},100000,'2026-12-30','2027-01-05',92,8,true)`;
      await sql`SELECT pg_temp.prepare_year_end_awards(2026)`; await sql`SELECT pg_temp.confirm_year_end_award(2026,'US',${a})`;
      const [after] = await sql`SELECT pg_temp.creator_split_percent(${a}) AS n,pg_temp.creator_request_split_percent(${a}) AS request`; expect(after).toMatchObject({n:95,request:90});
      // An award has no expiry and remains effective after other tier records disappear.
      await sql`DELETE FROM pg_temp.creator_split_settings`; await sql`DELETE FROM pg_temp.power_weeks`; await sql`DELETE FROM pg_temp.founding_creators`;
      const [lasting] = await sql`SELECT pg_temp.creator_split_percent(${a}) AS n`; expect(lasting.n).toBe(95);
      await sql`SELECT set_config('test.actor',${a},true)`;
      const [own] = await sql`SELECT pg_temp.get_my_revenue_terms() AS terms`; expect(own.terms).toMatchObject({vault_percent:95,lifetime_award:true,power_week_expires_at:null,request_percent:85});
    });
  });
  it("does not allow client writes to awards or public access to split lookups", async () => {
    if (!db) throw new Error("Database required");
    for (const role of ["anon","authenticated"]) {
      for (const table of ["year_end_award_reviews","year_end_award_candidates","creator_lifetime_awards"]) {
        const [grants] = await db`SELECT has_table_privilege(${role},${`public.${table}`},'INSERT') AS i,has_table_privilege(${role},${`public.${table}`},'UPDATE') AS u,has_table_privilege(${role},${`public.${table}`},'DELETE') AS d`;
        expect(grants).toEqual({i:false,u:false,d:false});
      }
      const [split] = await db`SELECT has_function_privilege(${role},'public.creator_split_percent(uuid)','EXECUTE') AS allowed`; expect(split.allowed).toBe(false);
    }
  });
});