// @vitest-environment node
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { CLEAN_TEMP_SCHEMA_SQL } from "./tempSchemaCleanup";

const db = process.env.SUPABASE_DB_URL ? postgres(process.env.SUPABASE_DB_URL, { max: 1, prepare: false, connect_timeout: 30 }) : null;
describe.skipIf(!db)("selected security fixes", () => {
  afterAll(async () => { await db?.end(); });

  it("keeps view receipts inaccessible to clients", async () => {
    const [access] = await db!`SELECT
      has_table_privilege('anon','public.media_view_receipts','SELECT') public_read,
      has_table_privilege('authenticated','public.media_view_receipts','SELECT') member_read,
      has_table_privilege('authenticated','public.media_view_receipts','INSERT') member_write`;
    expect(access).toEqual({ public_read: false, member_read: false, member_write: false });
  });

  it("keeps fan identities and amounts private while showing public rankings", async () => {
    await db!.begin(async sql => {
      await sql.unsafe(CLEAN_TEMP_SCHEMA_SQL);
      await sql.unsafe(`CREATE TEMP TABLE transactions(buyer_id uuid,creator_id uuid,amount_usd numeric,status text);
        CREATE TEMP TABLE custom_requests(customer_id uuid,creator_id uuid,amount_usd numeric,status text);
        CREATE TEMP TABLE public_profiles(user_id uuid,display_name text,avatar_config jsonb);
        CREATE FUNCTION pg_temp.has_role(uuid,public.app_role) RETURNS boolean LANGUAGE sql AS $$ SELECT current_setting('test.admin',true)='true' $$`);
      const [{ definition }] = await sql`SELECT pg_get_functiondef('public.get_top_fans(uuid)'::regprocedure) definition`;
      let body = definition.replaceAll("auth.uid()", "nullif(current_setting('test.actor',true),'')::uuid");
      for (const name of ["get_top_fans", "transactions", "custom_requests", "public_profiles", "has_role"]) body = body.replaceAll(`public.${name}`, `pg_temp.${name}`);
      await sql.unsafe(body);
      const owner=crypto.randomUUID(), fan=crypto.randomUUID(), outsider=crypto.randomUUID();
      await sql`INSERT INTO transactions VALUES(${fan},${owner},20,'completed')`;
      await sql`SELECT set_config('test.actor',${outsider},true),set_config('test.admin','false',true)`;
      const [publicRank] = await sql`SELECT * FROM pg_temp.get_top_fans(${owner})`;
      expect(publicRank.fan_id).toBeNull();
      expect(publicRank.total_spent).toBeNull();
      await sql`SELECT set_config('test.actor',${fan},true)`;
      expect((await sql`SELECT * FROM pg_temp.get_top_fans(${owner})`)[0].fan_id).toBe(fan);
      await sql`SELECT set_config('test.actor',${owner},true)`;
      expect((await sql`SELECT * FROM pg_temp.get_top_fans(${owner})`)[0].fan_id).toBe(fan);
      await sql`SELECT set_config('test.actor','',true)`;
      expect(await sql`SELECT * FROM pg_temp.get_top_fans(${owner})`).toHaveLength(0);
    });
  });

  it("keeps private roles scoped without breaking public creator labels", async () => {
    await db!.begin(async sql => {
      await sql.unsafe(CLEAN_TEMP_SCHEMA_SQL);
      await sql.unsafe("CREATE TEMP TABLE user_roles(user_id uuid,role public.app_role); CREATE TEMP TABLE public_profiles(user_id uuid,role text)");
      const [{ definition }] = await sql`SELECT pg_get_functiondef('public.has_role(uuid,public.app_role)'::regprocedure) definition`;
      await sql.unsafe(definition.replaceAll("public.has_role", "pg_temp.has_role").replaceAll("public.user_roles", "pg_temp.user_roles").replaceAll("public.public_profiles", "pg_temp.public_profiles").replaceAll("auth.uid()", "nullif(current_setting('test.actor',true),'')::uuid").replaceAll("auth.role()", "current_setting('test.auth',true)"));
      const me = crypto.randomUUID(), other = crypto.randomUUID(), creator = crypto.randomUUID();
      await sql`INSERT INTO user_roles VALUES(${me},'customer'),(${other},'admin'),(${creator},'creator')`;
      await sql`SELECT set_config('test.actor',${me},true),set_config('test.auth','authenticated',true)`;
      expect((await sql`SELECT pg_temp.has_role(${me},'customer') ok`)[0].ok).toBe(true);
      expect((await sql`SELECT pg_temp.has_role(${other},'admin') ok`)[0].ok).toBe(false);
      expect((await sql`SELECT pg_temp.has_role(${creator},'creator') ok`)[0].ok).toBe(false);
      await sql`INSERT INTO public_profiles VALUES(${creator},'creator')`;
      expect((await sql`SELECT pg_temp.has_role(${creator},'creator') ok`)[0].ok).toBe(true);
      await sql`SELECT set_config('test.actor','',true),set_config('test.auth','anon',true)`;
      expect((await sql`SELECT pg_temp.has_role(${other},'admin') ok`)[0].ok).toBe(false);
      await sql`SELECT set_config('test.actor',${other},true),set_config('test.auth','authenticated',true)`;
      expect((await sql`SELECT pg_temp.has_role(${me},'customer') ok`)[0].ok).toBe(true);
      await sql`SELECT set_config('test.actor','',true),set_config('test.auth','service_role',true)`;
      expect((await sql`SELECT pg_temp.has_role(${other},'admin') ok`)[0].ok).toBe(true);
    });
  });

  it("conceals foreign identity references and preserves evidence retention", async () => {
    await db!.begin(async sql => {
      await sql.unsafe(CLEAN_TEMP_SCHEMA_SQL);
      await sql.unsafe("CREATE TEMP TABLE creator_verifications(document_bucket text,id_front_path text,id_back_path text,selfie_path text); CREATE FUNCTION pg_temp.has_role(uuid,public.app_role) RETURNS boolean LANGUAGE sql AS $$ SELECT current_setting('test.admin',true)='true' $$");
      const [{ definition }] = await sql`SELECT pg_get_functiondef('public.identity_evidence_is_referenced(text,text)'::regprocedure) definition`;
      await sql.unsafe(definition.replaceAll("public.identity_evidence_is_referenced", "pg_temp.identity_evidence_is_referenced").replaceAll("public.creator_verifications", "pg_temp.creator_verifications").replaceAll("public.has_role", "pg_temp.has_role").replaceAll("auth.uid()", "current_setting('test.actor')::uuid").replaceAll("auth.role()", "current_setting('test.auth')"));
      const me = crypto.randomUUID(), other = crypto.randomUUID();
      await sql`SELECT set_config('test.actor',${me},true),set_config('test.auth','authenticated',true),set_config('test.admin','false',true)`;
      await sql`INSERT INTO creator_verifications VALUES('identity-documents',${me + '/front.jpg'},NULL,NULL),('identity-documents',${other + '/front.jpg'},NULL,NULL)`;
      expect((await sql`SELECT pg_temp.identity_evidence_is_referenced('identity-documents',${me + '/front.jpg'}) v`)[0].v).toBe(true);
      expect((await sql`SELECT pg_temp.identity_evidence_is_referenced('identity-documents',${me + '/missing.jpg'}) v`)[0].v).toBe(false);
      for (const path of [other + '/front.jpg', other + '/missing.jpg']) {
        expect((await sql`SELECT pg_temp.identity_evidence_is_referenced('identity-documents',${path}) v`)[0].v).toBe(true);
      }
      await sql`SELECT set_config('test.admin','true',true)`;
      expect((await sql`SELECT pg_temp.identity_evidence_is_referenced('identity-documents',${other + '/missing.jpg'}) v`)[0].v).toBe(false);
    });
  });

  it("counts accessible teaser views once daily and denies unauthorized targets", async () => {
    await db!.begin(async sql => {
      await sql.unsafe(CLEAN_TEMP_SCHEMA_SQL);
      await sql.unsafe(`CREATE TEMP TABLE creator_media(id uuid PRIMARY KEY,creator_id uuid,bucket text,storage_path text,views bigint);
        CREATE TEMP TABLE media_view_receipts(media_id uuid,viewer_id uuid,viewed_on date DEFAULT ((now() AT TIME ZONE 'UTC')::date),PRIMARY KEY(media_id,viewer_id,viewed_on));
        CREATE FUNCTION pg_temp.has_role(uuid,public.app_role) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
        CREATE FUNCTION pg_temp.has_active_entry_pass(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT current_setting('test.entry')='true' $$;
        CREATE FUNCTION pg_temp.content_is_cleared(text,text) RETURNS boolean LANGUAGE sql AS $$ SELECT current_setting('test.cleared')='true' $$;
        CREATE FUNCTION pg_temp.get_active_teasers() RETURNS SETOF pg_temp.creator_media LANGUAGE sql AS $$ SELECT * FROM pg_temp.creator_media WHERE bucket='teasers' $$;`);
      const [{ definition }] = await sql`SELECT pg_get_functiondef('public.increment_media_view(uuid)'::regprocedure) definition`;
      let body = definition.replaceAll("auth.uid()", "nullif(current_setting('test.actor',true),'')::uuid");
      for (const name of ["increment_media_view", "creator_media", "media_view_receipts", "has_role", "has_active_entry_pass", "content_is_cleared", "get_active_teasers"]) body = body.replaceAll(`public.${name}`, `pg_temp.${name}`);
      await sql.unsafe(body);
      const me = crypto.randomUUID(), owner = crypto.randomUUID(), teaser = crypto.randomUUID(), vault = crypto.randomUUID();
      await sql`INSERT INTO creator_media VALUES(${teaser},${owner},'teasers','fixture',0),(${vault},${owner},'vault','fixture',0)`;
      await sql`SELECT set_config('test.actor',${me},true),set_config('test.entry','false',true),set_config('test.cleared','true',true)`;
      await sql`SELECT pg_temp.increment_media_view(${teaser})`;
      await sql`SELECT set_config('test.entry','true',true),set_config('test.cleared','false',true)`;
      await sql`SELECT pg_temp.increment_media_view(${teaser})`;
      expect((await sql`SELECT count(*) n FROM media_view_receipts`)[0].n).toBe('0');
      await sql`SELECT set_config('test.cleared','true',true)`;
      await sql`SELECT pg_temp.increment_media_view(${vault}),pg_temp.increment_media_view(${crypto.randomUUID()})`;
      await sql`SELECT pg_temp.increment_media_view(${teaser})`;
      await sql`SELECT pg_temp.increment_media_view(${teaser})`;
      expect((await sql`SELECT views FROM creator_media WHERE id=${teaser}`)[0].views).toBe('1');
      expect((await sql`SELECT views FROM creator_media WHERE id=${vault}`)[0].views).toBe('0');
      await sql`SELECT set_config('test.actor',${owner},true)`;
      await sql`SELECT pg_temp.increment_media_view(${teaser})`;
      await sql`SELECT set_config('test.actor','',true)`;
      await sql`SELECT pg_temp.increment_media_view(${teaser})`;
      expect((await sql`SELECT count(*) n FROM media_view_receipts`)[0].n).toBe('1');
    });
  });
});