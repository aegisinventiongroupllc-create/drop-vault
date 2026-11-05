import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { bunnyApi, UUID } from '../_shared/bunnyStream.ts';
const schema = z.object({ action: z.enum(['start','complete','cancel','delete']), bucket: z.enum(['vault','teasers']), path: z.string().min(1).max(300), media_id: z.string().uuid().optional() });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type':'application/json', 'Cache-Control':'no-store' } });
Deno.serve(async req => {
 if (req.method === 'OPTIONS') return new Response('ok',{headers:corsHeaders});
 if (req.method !== 'POST') return json({error:'Method not allowed'},405);
 try {
  const url = Deno.env.get('SUPABASE_URL'), key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return json({error:'Unavailable'},503);
  const db = createClient(url,key);
  const token = req.headers.get('Authorization')?.replace(/^Bearer /,'');
  if (!token) return json({error:'Sign in required'},401);
  const {data:claims,error:authError} = await db.auth.getClaims(token);
  const uid = claims?.claims?.sub;
  if (authError || typeof uid !== 'string') return json({error:'Sign in required'},401);
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return json({error:'Invalid upload request'},400);
  const {action,bucket,path,media_id} = parsed.data;
  if (!path.startsWith(`${uid}/`) || path.includes('..') || path.split('/').length !== 2) return json({error:'Owned original required'},403);
  // Use the caller session for the existing audited creator gate.
  const caller = createClient(url,Deno.env.get('SUPABASE_ANON_KEY') ?? '',{global:{headers:{Authorization:`Bearer ${token}`}}});
  const {data:eligible,error:gateError} = await caller.rpc('can_upload_creator_media',{_creator_id:uid});
  if (gateError || eligible !== true) return json({error:'Approved adult creator required'},403);
  const {data:evidence,error:evidenceError} = await db.rpc('participant_object_evidence',{_bucket:bucket,_path:path}).maybeSingle();
  if (evidenceError || !evidence) return json({error:'Private watermarked original required'},400);
  const check = (result: any) => { if(result.error) throw new Error('Unable to save upload record'); };
  let {data:copy,error:copyError} = await db.from('bunny_video_deliveries').select('*').eq('bucket',bucket).eq('storage_path',path).eq('creator_id',uid).maybeSingle();
  if(copyError) throw new Error('Upload record unavailable');
  if(action==='start') {
   if (!copy) {
    // Only the server-selected original can populate the delivery copy. Never
    // hand out TUS signatures permitting a client to replace reviewed content.
    const signed = await db.storage.from(bucket).createSignedUrl(path,3600);
    if(signed.error || !signed.data?.signedUrl) throw new Error('Original unavailable');
    const title=`DTT-${crypto.randomUUID()}`;
    const fetched = await bunnyApi('/videos/fetch','POST',{url:signed.data.signedUrl,title});
    if(fetched.success!==true)throw new Error('Provider did not accept the video');
    let video:any=null;
    for(let attempt=0;attempt<15;attempt++){
      const candidates=await bunnyApi(`/videos?search=${encodeURIComponent(title)}&itemsPerPage=10`);
      const matches=(candidates.items??[]).filter((v:any)=>v.title===title);
      if(matches.length===1){video=matches[0];break;}
      await new Promise(resolve=>setTimeout(resolve,2000));
    }
    if(!video)throw new Error('Provider accepted the video but identification failed. Contact support before retrying.');
    if (!UUID.test(video.guid)) throw new Error('Invalid provider video');
    const saved = await db.from('bunny_video_deliveries').insert({creator_id:uid,bucket,storage_path:path,source_updated_at:evidence.updated_at,video_id:video.guid,state:'processing'}).select('*').single();
    if(saved.error){await bunnyApi(`/videos/${video.guid}`,'DELETE');throw new Error('Unable to save upload record');}
    copy=saved.data;
   }
   if(!copy || !['processing','ready'].includes(copy.state) || copy.source_updated_at!==evidence.updated_at) return json({error:'Upload version unavailable'},409);
   return json({success:true,processing:copy.state!=='ready'});
  }
  if(!copy) return action==='cancel'||action==='delete'?json({success:true,legacy:true}):json({error:'Upload unavailable'},404);
  if(action==='complete') {
   const video = await bunnyApi(`/videos/${copy.video_id}`);
   if([5,6].includes(video.status)) {check(await db.from('bunny_video_deliveries').update({state:'failed'}).eq('id',copy.id));return json({error:'Bunny could not process this video'},400);}
   if(video.status===0) return json({error:'Video transfer not confirmed'},409);
   check(await db.from('bunny_video_deliveries').update({state:[3,4].includes(video.status)?'ready':'processing'}).eq('id',copy.id));
   return json({success:true,processing:![3,4].includes(video.status)});
  }
  const {data:listing} = await db.from('creator_media').select('id').eq('bucket',bucket).eq('storage_path',path).eq('creator_id',uid).maybeSingle();
  if(action==='cancel' && listing) return json({error:'Registered media cannot be cancelled'},409);
  if(action==='delete') {
   if(!media_id || listing?.id!==media_id) return json({error:'Owned listing required'},403);
   const {count,error} = await db.from('user_permanent_library').select('video_id',{count:'exact',head:true}).eq('video_id',media_id);
   if(error || (count??0)>0) return json({error:'Permanently owned videos cannot be deleted'},409);
   // Delete the listing first: the database FK also protects concurrent buyouts.
   const deleted = await db.from('creator_media').delete().eq('id',media_id).eq('creator_id',uid);check(deleted);
  }
  check(await db.from('bunny_video_deliveries').update({state:'deleting'}).eq('id',copy.id));
  await bunnyApi(`/videos/${copy.video_id}`,'DELETE');
  check(await db.from('bunny_video_deliveries').delete().eq('id',copy.id));
  return json({success:true});
 }catch(e){return json({error:e instanceof Error?e.message:'Upload unavailable'},400);}
});