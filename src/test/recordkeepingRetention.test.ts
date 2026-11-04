// @vitest-environment node
import { afterAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
const db=process.env.SUPABASE_DB_URL?postgres(process.env.SUPABASE_DB_URL,{max:1,prepare:false,connect_timeout:30}):null;
describe.skipIf(!db)('recordkeeping preservation safeguards',()=>{
 afterAll(async()=>{await db?.end();});
 it('retains referenced identity evidence across all three ID buckets',async()=>{
  if(!db)throw Error('Database required');
  const rows=await db`SELECT policyname,qual FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Retain all referenced creator identity evidence'`;
  expect(rows).toHaveLength(1);
  for(const bucket of ['identity-documents','id-verifications','creator-2257-records'])expect(rows[0].qual).toContain(bucket);
  const privileges=await db`SELECT has_function_privilege('anon','public.identity_evidence_is_referenced(text,text)','EXECUTE') AS anonymous`;
  expect(privileges[0].anonymous).toBe(false);
 });
 it.each(['UPDATE','DELETE'])('prevents %s of historical content decisions',async operation=>{
  if(!db)throw Error('Database required');
  await expect(db.begin(async sql=>{
   await sql.unsafe(`CREATE TEMP TABLE event_fixture(id integer,reason text); CREATE TRIGGER preserve BEFORE UPDATE OR DELETE ON event_fixture FOR EACH ROW EXECUTE FUNCTION public.preserve_content_review_history(); INSERT INTO event_fixture VALUES(1,'Original');`);
   await sql.unsafe(operation==='UPDATE'?"UPDATE event_fixture SET reason='Changed'":"DELETE FROM event_fixture WHERE id=1");
  })).rejects.toThrow(/Content review history is immutable/);
 });
 const fixture=`CREATE TEMP TABLE consent_fixture(LIKE public.participant_consents INCLUDING DEFAULTS); CREATE TRIGGER preserve BEFORE UPDATE OR DELETE ON consent_fixture FOR EACH ROW EXECUTE FUNCTION public.preserve_participant_consent_record(); INSERT INTO consent_fixture(manifest_id,participant_id,signed_name,consent_text,release_path) VALUES(gen_random_uuid(),gen_random_uuid(),'Fixture','Original permission','private/release');`;
 it.each(["UPDATE consent_fixture SET consent_text='Changed'","DELETE FROM consent_fixture WHERE signed_name='Fixture'"])('retains signed permission: %s',async statement=>{
  if(!db)throw Error('Database required');
  await expect(db.begin(async sql=>{await sql.unsafe(fixture);await sql.unsafe(statement);})).rejects.toThrow(/immutable|must be retained/);
 });
 it('allows withdrawal without erasing signed permission',async()=>{
  if(!db)throw Error('Database required');const rollback=Error('rollback');
  await db.begin(async sql=>{
   await sql.unsafe(fixture);await sql`UPDATE consent_fixture SET revoked_at='2026-11-04T14:00:00Z'`;
   const rows=await sql`SELECT consent_text,revoked_at IS NOT NULL AS revoked FROM consent_fixture`;
   expect(rows[0]).toEqual({consent_text:'Original permission',revoked:true});throw rollback;
  }).catch(e=>{if(e!==rollback)throw e;});
 });
 it('prevents erasing an existing withdrawal',async()=>{
  if(!db)throw Error('Database required');
  await expect(db.begin(async sql=>{await sql.unsafe(fixture);await sql`UPDATE consent_fixture SET revoked_at='2026-11-04T14:00:00Z'`;await sql`UPDATE consent_fixture SET revoked_at=NULL`;})).rejects.toThrow(/revocation cannot be erased/);
 });
});