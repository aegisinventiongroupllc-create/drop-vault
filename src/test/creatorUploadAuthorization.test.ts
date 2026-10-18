// @vitest-environment node
import { afterAll, describe, expect, it } from "vitest";
import postgres from "postgres";
const db = process.env.SUPABASE_DB_URL ? postgres(process.env.SUPABASE_DB_URL, { max: 1 }) : null;
describe.skipIf(!db)("creator upload authorization", () => {
  afterAll(async () => { await db?.end(); });
  it.each(["INSERT", "UPDATE"])("restricts %s on every creator bucket without blocking onboarding", async cmd => {
    if (!db) throw Error("Database required");
    const rows = await db`SELECT roles,qual,with_check FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND cmd=${cmd} AND permissive='RESTRICTIVE'`;
    expect(rows).toHaveLength(1);
    expect(rows[0].roles).toEqual(["authenticated"]);
    for (const clause of cmd === "UPDATE" ? [rows[0].qual, rows[0].with_check] : [rows[0].with_check]) {
      expect(clause).toContain("can_upload_creator_media(auth.uid())");
      for (const bucket of ["teasers", "vault", "creator-profile-photos", "request-deliveries"]) expect(clause).toContain(`'${bucket}'`);
      for (const bucket of ["id-verifications", "profile-avatars"]) expect(clause).not.toContain(`'${bucket}'`);
    }
  });
  it.each(["creator_media", "creator_profile_photos"])("prevents %s registration bypass", async table => {
    if (!db) throw Error("Database required");
    const rows = await db`SELECT cmd,with_check FROM pg_policies WHERE schemaname='public' AND tablename=${table} AND permissive='RESTRICTIVE'`;
    expect(rows.map(r => r.cmd).sort()).toEqual(["INSERT", "UPDATE"]);
    for (const row of rows) expect(row.with_check).toContain("can_upload_creator_media(creator_id)");
  });
  it.each(["anon", "authenticated"])("denies %s Yoti evidence writes", async role => {
    if (!db) throw Error("Database required");
    const rows = await db`SELECT has_table_privilege(${role},'public.yoti_age_checks','INSERT') AS insert,has_table_privilege(${role},'public.yoti_age_checks','UPDATE') AS update`;
    expect(rows[0]).toEqual({ insert: false, update: false });
  });
  it("prevents self-approved verification submissions", async () => {
    if (!db) throw Error("Database required");
    const rows = await db`SELECT with_check FROM pg_policies WHERE schemaname='public' AND tablename='creator_verifications' AND cmd='INSERT' AND permissive='RESTRICTIVE'`;
    expect(rows).toHaveLength(1);
    expect(rows[0].with_check).toContain("status = 'pending'");
    expect(rows[0].with_check).toContain("reviewed_at IS NULL");
  });
  type Case = { name: string; profile?: string; review?: string; reviewed?: boolean; yoti?: string; environment?: string; evidence?: boolean; role?: boolean; owner?: boolean; signedOut?: boolean; banned?: boolean; missingYoti?: boolean; newerFailed?: boolean; allowed: boolean };
  const cases: Case[] = [
    { name: "unverified", profile: "unsubmitted", allowed: false },
    { name: "pending approval", profile: "pending", allowed: false },
    { name: "rejected approval", profile: "rejected", allowed: false },
    { name: "forged profile approval", review: "pending", allowed: false },
    { name: "unreviewed approval", reviewed: false, allowed: false },
    { name: "missing Yoti", missingYoti: true, allowed: false },
    { name: "pending Yoti", yoti: "pending", allowed: false },
    { name: "failed Yoti", yoti: "failed", allowed: false },
    { name: "sandbox pass", environment: "sandbox", allowed: false },
    { name: "legacy pass", environment: "unknown", allowed: false },
    { name: "missing server evidence", evidence: false, allowed: false },
    { name: "not a creator", role: false, allowed: false },
    { name: "other account", owner: false, allowed: false },
    { name: "signed out", signedOut: true, allowed: false },
    { name: "banned creator", banned: true, allowed: false },
    { name: "latest failed check", newerFailed: true, allowed: false },
    { name: "approved live verified creator", allowed: true },
  ];
  it.each(cases)("$name: upload and request attachment", async test => {
    if (!db) throw Error("Database required");
    const rollback = new Error("rollback fixtures");
    await db.begin(async sql => {
      await sql.unsafe(`CREATE TEMP TABLE profiles(user_id uuid,verification_status text);
        CREATE TEMP TABLE creator_verifications(user_id uuid,status text,reviewed_at timestamptz);
        CREATE TEMP TABLE yoti_age_checks(id uuid,user_id uuid,status text,environment text,server_verified_at timestamptz,created_at timestamptz);
        CREATE TEMP TABLE account_bans(user_id uuid);
        CREATE TEMP TABLE user_roles(user_id uuid,role text);
        CREATE TEMP TABLE custom_requests(id uuid,creator_id uuid,status text,delivery_path text,expires_at timestamptz);
        CREATE FUNCTION pg_temp.test_uid() RETURNS uuid LANGUAGE sql AS 'SELECT nullif(current_setting(''test.uid'',true),'''')::uuid';
        CREATE FUNCTION pg_temp.test_role(uid uuid,r text) RETURNS boolean LANGUAGE sql AS 'SELECT EXISTS(SELECT 1 FROM pg_temp.user_roles WHERE user_id=uid AND role=r)';`);
      for (const signature of ["can_upload_creator_media(uuid)", "can_upload_request_delivery(text)"]) {
        const rows = await sql`SELECT pg_get_functiondef(${`public.${signature}`}::regprocedure) AS definition`;
        let def = rows[0].definition.replaceAll("public.can_upload_creator_media", "pg_temp.can_upload_creator_media").replaceAll("public.can_upload_request_delivery", "pg_temp.can_upload_request_delivery").replaceAll("auth.uid()", "pg_temp.test_uid()").replaceAll("public.has_role", "pg_temp.test_role");
        for (const table of ["profiles", "creator_verifications", "yoti_age_checks", "account_bans", "custom_requests"]) def = def.replaceAll(`public.${table}`, `pg_temp.${table}`);
        await sql.unsafe(def);
      }
      const uid = crypto.randomUUID(); const request = crypto.randomUUID();
      await sql`SELECT set_config('test.uid',${test.signedOut ? "" : test.owner === false ? crypto.randomUUID() : uid},true)`;
      await sql`INSERT INTO pg_temp.profiles VALUES(${uid},${test.profile ?? "approved"})`;
      await sql`INSERT INTO pg_temp.creator_verifications VALUES(${uid},${test.review ?? "approved"},${test.reviewed === false ? null : new Date()})`;
      if (test.role !== false) await sql`INSERT INTO pg_temp.user_roles VALUES(${uid},'creator')`;
      if (!test.missingYoti) await sql`INSERT INTO pg_temp.yoti_age_checks VALUES(gen_random_uuid(),${uid},${test.yoti ?? "passed"},${test.environment ?? "live"},${test.evidence === false ? null : new Date()},now())`;
      if (test.newerFailed) await sql`INSERT INTO pg_temp.yoti_age_checks VALUES(gen_random_uuid(),${uid},'failed','live',null,now()+interval '1 second')`;
      if (test.banned) await sql`INSERT INTO pg_temp.account_bans VALUES(${uid})`;
      await sql`INSERT INTO pg_temp.custom_requests VALUES(${request},${uid},'accepted',null,now()+interval '1 day')`;
      const result = await sql`SELECT pg_temp.can_upload_creator_media(${uid}) AS upload,pg_temp.can_upload_request_delivery(${`${uid}/${request}/video.mp4`}) AS delivery`;
      expect(result[0]).toEqual({ upload: test.allowed, delivery: test.allowed });
      throw rollback;
    }).catch(error => { if (error !== rollback) throw error; });
  });
});