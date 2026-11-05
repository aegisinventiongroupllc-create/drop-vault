// @vitest-environment node
import { afterAll, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { bunnyPlaybackUrl, deliveryUrl } from '../../supabase/functions/_shared/bunnyStream';
const db=process.env.SUPABASE_DB_URL?postgres(process.env.SUPABASE_DB_URL,{max:1,prepare:false,connect_timeout:30}):null;
describe.skipIf(!db)('Bunny private delivery records',()=>{
 afterAll(async()=>{await db?.end();});
 it.each(['anon','authenticated'])('does not let %s read or change provider records',async role=>{
  if(!db)throw new Error('Database required');
  const [r]=await db`select has_table_privilege(${role},'public.bunny_video_deliveries','SELECT') as read,has_table_privilege(${role},'public.bunny_video_deliveries','INSERT') as insert,has_table_privilege(${role},'public.bunny_video_deliveries','UPDATE') as update`;
  expect(r).toEqual({read:false,insert:false,update:false});
 });
 it('enforces owner and exact original version',async()=>{
  if(!db)throw new Error('Database required');
  const rollback=new Error('rollback synthetic fixtures');
  try { await db.begin(async sql=>{
   const [row]=await sql`select pg_get_functiondef('public.bunny_source_current(uuid)'::regprocedure) as definition`;
   await sql`create temp table if not exists bunny_copies (like public.bunny_video_deliveries including defaults) on commit drop`;
   await sql`create temp table if not exists source_objects(bucket_id text,name text,updated_at timestamptz) on commit drop`;
   await sql.unsafe(row.definition.replace('public.bunny_source_current','pg_temp.source_current').replaceAll('public.bunny_video_deliveries','pg_temp.bunny_copies').replaceAll('storage.objects','pg_temp.source_objects'));
   const id=crypto.randomUUID(),owner=crypto.randomUUID(),video=crypto.randomUUID(),path=owner+'/video.mp4',stamp=new Date();
   await sql`insert into pg_temp.bunny_copies(id,creator_id,bucket,storage_path,source_updated_at,video_id) values(${id},${owner},'vault',${path},${stamp},${video})`;
   await sql`insert into pg_temp.source_objects values('vault',${path},${stamp})`;
   expect((await sql`select pg_temp.source_current(${id}) as allowed`)[0].allowed).toBe(true);
   await sql`update pg_temp.source_objects set updated_at=updated_at+interval '1 second'`;
   expect((await sql`select pg_temp.source_current(${id}) as allowed`)[0].allowed).toBe(false);
   throw rollback;
  }); }catch(error){if(error!==rollback)throw error;}
 });
});
describe('Bunny playback boundaries',()=>{
 it('keeps legacy objects on existing delivery',async()=>{
  const query={select:()=>query,eq:()=>query,maybeSingle:async()=>({data:null,error:null})};
  expect(await deliveryUrl({from:()=>query},'vault','owner/old.mp4',300)).toBeNull();
 });
 it('rejects stale provider copies before making provider calls',async()=>{
  const query={select:()=>query,eq:()=>query,maybeSingle:async()=>({data:{id:'copy',state:'ready'},error:null})};
  await expect(deliveryUrl({from:()=>query,rpc:async()=>({data:false})},'vault','owner/video.mp4',300)).rejects.toThrow('Video version unavailable');
 });
 it('caps new video playback links at 300 seconds',async()=>{
  vi.stubGlobal('Deno',{env:{get:()=> 'non-secret-test-fixture'}});
  await expect(bunnyPlaybackUrl('00000000-0000-4000-8000-000000000001',301)).rejects.toThrow('Protected playback unavailable');
  await expect(bunnyPlaybackUrl('00000000-0000-4000-8000-000000000001',0)).rejects.toThrow('Protected playback unavailable');
  vi.unstubAllGlobals();
 });
});