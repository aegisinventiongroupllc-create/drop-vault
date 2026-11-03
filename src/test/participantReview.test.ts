// @vitest-environment node
import { afterAll,describe,expect,it } from 'vitest';
import postgres from 'postgres';
import { adultAtRecording } from '../../supabase/functions/_shared/participantRules';
describe('participant recording age',()=>{
 it('allows a participant exactly 18 at recording',()=>expect(adultAtRecording('2000-11-03','2018-11-03','2026-11-03')).toBe(true));
 it('rejects a person adult now but 17 at recording',()=>expect(adultAtRecording('2000-11-03','2018-11-02','2026-11-03')).toBe(false));
 it('rejects future recording dates',()=>expect(adultAtRecording('2000-01-01','2026-11-04','2026-11-03')).toBe(false));
 it('rejects invalid calendar dates',()=>expect(adultAtRecording('2000-02-30','2026-11-03','2026-11-03')).toBe(false));
});
const db=process.env.SUPABASE_DB_URL?postgres(process.env.SUPABASE_DB_URL,{max:1,prepare:false}):null;
describe.skipIf(!db)('participant server clearance',()=>{
 afterAll(async()=>{await db?.end();});
 it.each(['content_participants','participant_consents','content_manifests','participant_invitations','content_review_events'])('denies direct private %s access',async table=>{
  if(!db)throw Error('Database required');
  const r=await db`SELECT has_table_privilege('authenticated',${`public.${table}`},'SELECT') AS read,has_table_privilege('authenticated',${`public.${table}`},'INSERT') AS write,has_table_privilege('anon',${`public.${table}`},'SELECT') AS public_read`;
  expect(r[0]).toEqual({read:false,write:false,public_read:false});
 });
 it('denies direct approval calls',async()=>{if(!db)throw Error('Database required');const r=await db`SELECT has_function_privilege('authenticated','public.review_participant_content(uuid,text,text,text,uuid,boolean)','EXECUTE') AS allowed`;expect(r[0].allowed).toBe(false);});
 it('retains private capped participant evidence',async()=>{if(!db)throw Error('Database required');const r=await db`SELECT public,file_size_limit FROM storage.buckets WHERE id='participant-evidence'`;expect(r[0].public).toBe(false);expect(Number(r[0].file_size_limit)).toBe(10485760);});
 it.each([
  ['valid',true],['legacy',false],['pending',false],['underage',false],['guest-unverified',false],['guest-underage',false],['missing-consent',false],['wrong-content-consent',false],['revoked-consent',false],['replaced-object',false],['held',false],['missing-participant',false],['missing-uploader',false],['incomplete-list',false],['banned',false]
 ] as const)('%s content clearance',async(name,allowed)=>{
  if(!db)throw Error('Database required');const rollback=new Error('rollback');
  await db.begin(async sql=>{
   await sql.unsafe(`CREATE TEMP TABLE content_manifests (LIKE public.content_manifests INCLUDING DEFAULTS);CREATE TEMP TABLE content_participants(LIKE public.content_participants INCLUDING DEFAULTS);CREATE TEMP TABLE participant_consents(LIKE public.participant_consents INCLUDING DEFAULTS);CREATE TEMP TABLE creator_verifications(LIKE public.creator_verifications INCLUDING DEFAULTS);CREATE TEMP TABLE account_bans(LIKE public.account_bans INCLUDING DEFAULTS);CREATE TEMP TABLE objects(bucket_id text,name text,updated_at timestamptz);`);
   const r=await sql`SELECT pg_get_functiondef('public.content_is_cleared(text,text)'::regprocedure) AS definition`;let def=r[0].definition.replaceAll('public.content_is_cleared','pg_temp.content_is_cleared').replaceAll('storage.objects','pg_temp.objects');for(const t of ['content_manifests','content_participants','participant_consents','creator_verifications','account_bans'])def=def.replaceAll(`public.${t}`,`pg_temp.${t}`);await sql.unsafe(def);
   const owner=crypto.randomUUID(),pid=crypto.randomUUID(),mid=crypto.randomUUID(),reviewer=crypto.randomUUID(),updated=new Date(),path=`${owner}/video.mp4`;
   await sql`INSERT INTO pg_temp.objects VALUES('vault',${path},${name==='replaced-object'?new Date(updated.getTime()+1000):updated})`;
   await sql`INSERT INTO pg_temp.creator_verifications(user_id,legal_first_name,legal_last_name,date_of_birth,id_front_path,id_back_path,selfie_path,status,identity_confirmed,reviewed_at,reviewer_id) VALUES(${owner},'Fixture','Only',${name==='underage'?'2010-01-01':'1980-01-01'},'id','','selfie','approved',true,now(),${reviewer})`;
   await sql`INSERT INTO pg_temp.content_participants(id,creator_id,label,date_of_birth,status,identity_confirmed,reviewer_id,reviewed_at) VALUES(${pid},${owner},'Fixture',${name==='guest-underage'?'2010-01-01':'1980-01-01'},${name==='guest-unverified'?'pending':'approved'},true,${reviewer},now())`;
   if(name!=='legacy')await sql`INSERT INTO pg_temp.content_manifests(id,creator_id,bucket,storage_path,object_updated_at,title,recorded_on,participant_ids,includes_uploader,complete_declaration,status,identity_confirmed,age_at_recording_confirmed,participants_confirmed,rights_confirmed,reviewer_id,reviewed_at) VALUES(${mid},${owner},'vault',${path},${updated},'Fixture','2020-01-01',${sql.array([name==='missing-participant'?crypto.randomUUID():pid])}::uuid[],${name!=='missing-uploader'},${name!=='incomplete-list'},${name==='pending'?'pending':name==='held'?'held':'approved'},true,true,true,true,${reviewer},now())`;
   if(name!=='missing-consent')await sql`INSERT INTO pg_temp.participant_consents(manifest_id,participant_id,signed_name,consent_text,release_path,revoked_at) VALUES(${name==='wrong-content-consent'?crypto.randomUUID():mid},${pid},'Fixture','Consent','release',${name==='revoked-consent'?updated:null})`;
   if(name==='banned')await sql`INSERT INTO pg_temp.account_bans(user_id,reason,tokens_revoked) VALUES(${owner},'Fixture',0)`;
   const result=await sql`SELECT pg_temp.content_is_cleared('vault',${path}) AS allowed`;expect(result[0].allowed).toBe(allowed);throw rollback;
  }).catch(e=>{if(e!==rollback)throw e;});
 });
});