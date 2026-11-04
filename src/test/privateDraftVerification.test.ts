// @vitest-environment node
import { afterAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { draftStatusAllowed, validIdentityExpiry } from "@/lib/creatorDraftRules";
const db = process.env.SUPABASE_DB_URL ? postgres(process.env.SUPABASE_DB_URL,{max:1,prepare:false,connect_timeout:30}) : null;
describe("private draft and identity rules",()=>{
  it.each(["unsubmitted","pending","flagged"])("allows %s private preparation",status=>expect(draftStatusAllowed(status)).toBe(true));
  it("rejects declined draft uploads",()=>expect(draftStatusAllowed("rejected")).toBe(false));
  it("rejects underage draft uploads",()=>expect(draftStatusAllowed("pending",false,true)).toBe(false));
  it("rejects expired identification",()=>expect(validIdentityExpiry("2026-11-03",new Date("2026-11-04T12:00:00Z"))).toBe(false));
  it("accepts identification through its expiration date",()=>expect(validIdentityExpiry("2026-11-04",new Date("2026-11-04T12:00:00Z"))).toBe(true));
});
describe.skipIf(!db)("deployed private verification safeguards",()=>{
  afterAll(async()=>{await db?.end();});
  it("uses private ID and draft buckets",async()=>{
    if(!db)throw Error("Database required");
    const rows=await db`SELECT id,public FROM storage.buckets WHERE id IN ('creator-2257-records','creator-drafts') ORDER BY id`;
    expect(rows).toEqual([{id:"creator-2257-records",public:false},{id:"creator-drafts",public:false}]);
  });
  it("keeps signed consent records service-written",async()=>{
    if(!db)throw Error("Database required");
    const rows=await db`SELECT has_table_privilege('anon','public.age_consent_receipts','SELECT') AS public_read,has_table_privilege('authenticated','public.age_consent_receipts','INSERT') AS owner_write`;
    expect(rows[0]).toEqual({public_read:false,owner_write:false});
  });
  it("denies customer/anonymous draft access and client audit mutation",async()=>{
    if(!db)throw Error("Database required");
    const rows=await db`SELECT has_table_privilege('anon','public.creator_drafts','SELECT') AS public_read,has_table_privilege('authenticated','public.creator_identity_events','UPDATE') AS audit_update,has_table_privilege('authenticated','public.creator_identity_events','DELETE') AS audit_delete`;
    expect(rows[0]).toEqual({public_read:false,audit_update:false,audit_delete:false});
  });
  it("keeps new uploads unpublished drafts by default",async()=>{
    if(!db)throw Error("Database required");
    const rows=await db`SELECT column_name,column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='creator_drafts' AND column_name IN ('status','is_published') ORDER BY column_name`;
    expect(rows).toEqual([{column_name:"is_published",column_default:"false"},{column_name:"status",column_default:"'draft'::text"}]);
  });
  it.each([{status:"draft",published:true},{status:"published",published:false}])("rejects draft publication state $status/$published",async({status,published})=>{
    if(!db)throw Error("Database required");
    await expect(db.begin(async sql=>{
      await sql.unsafe(`CREATE TEMP TABLE test_drafts(creator_id uuid,storage_path text,kind text,is_published boolean,status text); CREATE TRIGGER test_protect BEFORE UPDATE ON test_drafts FOR EACH ROW EXECUTE FUNCTION public.protect_draft_registration(); INSERT INTO test_drafts VALUES(gen_random_uuid(),'private/example.mp4','video',false,'draft');`);
      await sql`UPDATE test_drafts SET status=${status},is_published=${published}`;
    })).rejects.toThrow(/Draft ownership, media and publication are server managed/);
  });
  it("refuses signed-out identity submission",async()=>{
    if(!db)throw Error("Database required");
    await expect(db`SELECT public.submit_creator_identity_v2('Example','2000-01-01','a','b','c','2030-01-01','passport','US','x')`).rejects.toThrow(/Creator sign-in required|permission denied for function submit_creator_identity_v2/);
  });
  it.each(["pending","flagged","unsubmitted","rejected"])("server draft authorization for %s",async status=>{
    if(!db)throw Error("Database required");
    const rollback=new Error("rollback fixtures");
    await db.begin(async sql=>{
      await sql.unsafe(`CREATE TEMP TABLE profiles(user_id uuid,verification_status text); CREATE TEMP TABLE account_bans(user_id uuid); CREATE TEMP TABLE creator_verifications(user_id uuid,status text,date_of_birth date); CREATE FUNCTION pg_temp.test_uid() RETURNS uuid LANGUAGE sql AS 'SELECT nullif(current_setting(''test.uid'',true),'''')::uuid'; CREATE FUNCTION pg_temp.test_role(uuid,text) RETURNS boolean LANGUAGE sql AS 'SELECT true';`);
      const rows=await sql`SELECT pg_get_functiondef('public.can_stage_creator_draft(uuid)'::regprocedure) AS definition`;
      let definition=rows[0].definition.replaceAll('public.can_stage_creator_draft','pg_temp.can_stage_creator_draft').replaceAll('auth.uid()','pg_temp.test_uid()').replaceAll('public.has_role','pg_temp.test_role');
      for(const table of ['profiles','account_bans','creator_verifications'])definition=definition.replaceAll(`public.${table}`,`pg_temp.${table}`);
      await sql.unsafe(definition);
      const uid=crypto.randomUUID(); await sql`SELECT set_config('test.uid',${uid},true)`;
      await sql`INSERT INTO pg_temp.profiles VALUES(${uid},${status})`;
      const result=await sql`SELECT pg_temp.can_stage_creator_draft(${uid}) AS allowed`;
      expect(result[0].allowed).toBe(status!=='rejected');
      const foreign=await sql`SELECT pg_temp.can_stage_creator_draft(${crypto.randomUUID()}) AS allowed`;
      expect(foreign[0].allowed).toBe(false);
      throw rollback;
    }).catch(error=>{if(error!==rollback)throw error;});
  });
});