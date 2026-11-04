import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { adultAtRecording, PARTICIPANT_CONSENT } from "../_shared/participantRules.ts";
const json = (body: unknown, status=200) => new Response(JSON.stringify(body), {status,headers:{...corsHeaders,"Content-Type":"application/json","Cache-Control":"no-store"}});
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);
const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(v=>v.toString(16).padStart(2,'0')).join('');
Deno.serve(async req => {
 if(req.method==='OPTIONS') return new Response('ok',{headers:corsHeaders});
 if(req.method!=='POST') return json({error:'Method not allowed'},405);
 try {
  const url=Deno.env.get('SUPABASE_URL'), key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!key)return json({error:'Unavailable'},503);
  const db=createClient(url,key); const body=await req.json();
  const check = (result: {error: unknown}) => {if(result.error)throw new Error('Unable to save private review record');};
  const readInvitation=async()=>{
   if(typeof body.token!=='string'||body.token.length!==64)throw new Error('Invitation unavailable');
   const {data:i}=await db.from('participant_invitations').select('*').eq('token_hash',await hash(body.token)).is('consumed_at',null).gt('expires_at',new Date().toISOString()).maybeSingle();
   if(!i)throw new Error('Invitation expired or already used'); return i;
  };
  if(['invitation','guest-submit','link-creator'].includes(body.action)){
   const i=await readInvitation(); const {data:p}=await db.from('content_participants').select('*').eq('id',i.participant_id).single();
   if(!p)throw new Error('Invitation unavailable');
   const {data:m}=i.manifest_id?await db.from('content_manifests').select('id,title,bucket,recorded_on,status').eq('id',i.manifest_id).single():{data:null};
   if(body.action==='invitation')return json({label:p.label,manifest:m,consent:PARTICIPANT_CONSENT,expires_at:i.expires_at});
   if(body.action==='link-creator'){
    const bearer=req.headers.get('Authorization')?.replace(/^Bearer /,'');if(!bearer)return json({error:'Creator sign-in required'},401);
    const {data:claims}=await db.auth.getClaims(bearer);const linked=claims?.claims?.sub;if(typeof linked!=='string'||linked===p.creator_id)throw new Error('A different verified creator must accept this invitation');
    const {data:role}=await db.from('user_roles').select('role').eq('user_id',linked).eq('role','creator').maybeSingle();
    const {data:v}=await db.from('creator_verifications').select('*').eq('user_id',linked).order('submitted_at',{ascending:false}).order('id',{ascending:false}).limit(1).maybeSingle();
    if(!role||!v||v.status!=='approved'||!v.identity_confirmed||!v.reviewed_at||m)throw new Error('Approved creator identity required; use the private form for content consent');
    const claimed=await db.from('participant_invitations').update({consumed_at:new Date().toISOString()}).eq('id',i.id).is('consumed_at',null).select('id').maybeSingle();check(claimed);if(!claimed.data)throw new Error('Invitation already used');
    check(await db.from('content_participants').update({linked_user_id:linked,legal_name:[v.legal_first_name,v.legal_last_name].filter(Boolean).join(' '),date_of_birth:v.date_of_birth,country:v.country,status:'pending'}).eq('id',p.id));return json({success:true});
   }
   if(body.agreed!==true || typeof body.legal_name!=='string'||body.legal_name.trim().length<2||body.legal_name.length>160||!adultAtRecording(body.dob,new Date().toISOString().slice(0,10)))throw new Error('Valid adult identity and agreement required');
   if(m && (!adultAtRecording(body.dob,m.recorded_on)||m.status==='approved'))throw new Error('Adult at recording required; approved content cannot be changed');
   // Consume before writing files: concurrent submissions cannot reuse this invitation.
   const claimed=await db.from('participant_invitations').update({consumed_at:new Date().toISOString()}).eq('id',i.id).is('consumed_at',null).select('id').maybeSingle(); check(claimed);if(!claimed.data)throw new Error('Invitation already used');
   const save=async(slot:string)=>{
    const f=body.files?.[slot]; if(!f||!['image/jpeg','image/png','image/webp','application/pdf'].includes(f.type)||typeof f.base64!=='string'||f.base64.length>14*1024*1024)throw new Error('Valid private document required');
    if(['id','selfie'].includes(slot)&&f.type==='application/pdf')throw new Error('ID and holding photo must be images');
    const bytes=Uint8Array.from(atob(f.base64),c=>c.charCodeAt(0));if(bytes.length<1||bytes.length>10*1024*1024)throw new Error('Document must be under 10 MB');
    const path=`${p.creator_id}/${p.id}/${crypto.randomUUID()}-${slot}`;check(await db.storage.from('participant-evidence').upload(path,bytes,{contentType:f.type,upsert:false}));return path;
   };
   const id_path=await save('id'),selfie_path=await save('selfie');
   check(await db.from('content_participants').update({legal_name:body.legal_name.trim(),date_of_birth:body.dob,aliases:String(body.aliases??'').slice(0,500),country:String(body.country??'').toUpperCase().slice(0,2),id_path,selfie_path,status:'pending',identity_confirmed:false}).eq('id',p.id));
   if(m){const release_path=await save('release');check(await db.from('participant_consents').insert({manifest_id:m.id,participant_id:p.id,signed_name:body.legal_name.trim(),consent_text:PARTICIPANT_CONSENT,release_path}));}
   return json({success:true});
  }
  const token=req.headers.get('Authorization')?.replace(/^Bearer /,''); if(!token)return json({error:'Sign in required'},401);
  const {data:claims,error:authError}=await db.auth.getClaims(token);const uid=claims?.claims?.sub;if(authError||typeof uid!=='string')return json({error:'Sign in required'},401);
  const {data:roles}=await db.from('user_roles').select('role').eq('user_id',uid);const admin=roles?.some(r=>r.role==='admin')===true,creator=roles?.some(r=>r.role==='creator')===true;
  if(!admin&&!creator)return json({error:'Creator or administrator required'},403);
  const invite=async(participant_id:string,manifest_id:string|null)=>{
   const secret=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(v=>v.toString(16).padStart(2,'0')).join('');
   check(await db.from('participant_invitations').insert({participant_id,manifest_id,token_hash:await hash(secret)}));return secret;
  };
  if(body.action==='list'){
   const offset=Number.isSafeInteger(body.offset)&&body.offset>=0?body.offset:0;
   let pq=db.from('content_participants').select(admin?'*':'id,label,status,created_at,reviewer_notes').order('created_at',{ascending:false}).range(offset,offset+24);
   let mq=db.from('content_manifests').select('*').order('created_at',{ascending:false}).range(offset,offset+24);
   if(!admin||body.own===true){pq=pq.eq('creator_id',uid);mq=mq.eq('creator_id',uid);}
   if(admin&&body.status&&body.status!=='all'){pq=pq.eq('status',body.status);mq=mq.eq('status',body.status);}
   if(admin&&body.country)pq=pq.eq('country',String(body.country).toUpperCase().slice(0,2));
   if(admin&&body.query)pq=pq.ilike('legal_name',`%${String(body.query).replace(/[%_]/g,'').slice(0,100)}%`);
   const [p,m]=await Promise.all([pq,mq]);check(p);check(m);
   const {data:staged}=await db.rpc('participant_staged_objects',{_owner:uid,_offset:offset});
   return json({participants:p.data,manifests:m.data,staged:staged??[]});
  }
  if(body.action==='invite'){
   if(!creator||typeof body.label!=='string'||body.label.trim().length<2)throw new Error('Participant name required');
   const {count}=await db.from('content_participants').select('id',{count:'exact',head:true}).eq('creator_id',uid).gte('created_at',new Date(Date.now()-86400000).toISOString());if((count??0)>=30)throw new Error('Daily invitation limit reached. Contact DTT support.');
   const p=await db.from('content_participants').insert({creator_id:uid,label:body.label.trim().slice(0,120)}).select('id').single();check(p);if(!p.data)throw new Error('Unable to invite');
   return json({token:await invite(p.data.id,null)});
  }
  if(body.action==='resend'){
   const {data:p}=await db.from('content_participants').select('id,creator_id,status').eq('id',body.participant_id).single();if(!p||p.creator_id!==uid||p.status==='approved')throw new Error('Pending owned participant required');return json({token:await invite(p.id,null)});
  }
  if(body.action==='consent-invite'){
   const {data:p}=await db.from('content_participants').select('id,creator_id').eq('id',body.participant_id).single();
   const {data:m}=await db.from('content_manifests').select('*').eq('id',body.manifest_id).single();
   if(!p||!m||p.creator_id!==uid||m.creator_id!==uid||!m.participant_ids.includes(p.id)||m.status==='approved')throw new Error('Not your pending content or participant');
   return json({token:await invite(p.id,m.id)});
  }
  if(body.action==='manifest'){
   const bucket=body.bucket,path=body.path;
   if(!creator||!['vault','teasers','creator-profile-photos','profile-backdrops','request-deliveries'].includes(bucket)||typeof path!=='string'||!path.startsWith(`${uid}/`)||path.includes('..'))throw new Error('Owned uploaded content required');
   const {data:objects}=await db.rpc('participant_object_evidence',{_bucket:bucket,_path:path}).maybeSingle();
   if(!objects)throw new Error('Upload the private file first');
   const {data:v}=await db.from('creator_verifications').select('date_of_birth,status,identity_confirmed').eq('user_id',uid).order('submitted_at',{ascending:false}).order('id',{ascending:false}).limit(1).maybeSingle();
   if(!v||v.status!=='approved'||!v.identity_confirmed||!adultAtRecording(v.date_of_birth,body.recorded_on))throw new Error('Uploader must be verified and adult at recording');
   const ids=Array.isArray(body.participant_ids)?[...new Set(body.participant_ids)]:[];if(ids.length>30||ids.some(id=>!uuid(id)))throw new Error('Invalid participant list');
   if(ids.length){const p=await db.from('content_participants').select('id,creator_id,date_of_birth,status').in('id',ids);check(p);if(p.data?.length!==ids.length||p.data.some(p=>p.creator_id!==uid||p.status!=='approved'||!adultAtRecording(p.date_of_birth,body.recorded_on)))throw new Error('All listed guests need approved adult identities');}
   const evidence=[body.production_path,body.rights_path];if(evidence.some(p=>typeof p!=='string'||!p.startsWith(`${uid}/`)))throw new Error('Production and distribution-rights records required');
   for(const path of evidence){const {data:doc}=await db.rpc('participant_object_evidence',{_bucket:'participant-evidence',_path:path}).maybeSingle();if(!doc)throw new Error('Evidence missing');}
   const result=await db.from('content_manifests').insert({creator_id:uid,bucket,storage_path:path,object_updated_at:objects.updated_at,title:String(body.title??'').slice(0,160),recorded_on:body.recorded_on,participant_ids:ids,complete_declaration:body.complete===true,production_evidence_path:body.production_path,rights_evidence_path:body.rights_path,status:'pending'}).select('id').single();check(result);return json({id:result.data?.id});
  }
  if(body.action==='documents'){
   if(!admin)return json({error:'Administrator required'},403);
   const table=body.kind==='participant'?'content_participants':'content_manifests';const {data:r}=await db.from(table).select('*').eq('id',body.id).single();if(!r)throw new Error('Record unavailable');
   check(await db.from('activity_logs').insert({user_id:uid,user_role:'admin',action_type:'participant_evidence_view',action_detail:'Opened private participant or content evidence',metadata:{record_id:r.id,kind:body.kind==='participant'?'participant':'content'},activity_date:new Date().toISOString().slice(0,10)}));
   const paths=body.kind==='participant'?[r.id_path,r.selfie_path]:[r.production_evidence_path,r.rights_evidence_path];
   if(body.kind==='participant'&&r.linked_user_id){const {data:v}=await db.from('creator_verifications').select('id_front_path,id_back_path,selfie_path,document_bucket').eq('user_id',r.linked_user_id).order('submitted_at',{ascending:false}).order('id',{ascending:false}).limit(1).maybeSingle();if(v){const signed=await db.storage.from(v.document_bucket).createSignedUrls([v.id_front_path,v.id_back_path,v.selfie_path].filter(Boolean),120);check(signed);return json({documents:signed.data});}}
   const consentResult=body.kind==='content'?await db.from('participant_consents').select('*').eq('manifest_id',r.id):{data:[],error:null};check(consentResult);const consents=consentResult.data;
   const evidence=[...paths,...(consents??[]).map(c=>c.release_path)].filter(Boolean);
   let participantDetails=[];
   if(body.kind==='content'&&r.participant_ids.length){const {data:ps}=await db.from('content_participants').select('id,label,legal_name,date_of_birth,status,id_path,selfie_path,linked_user_id').in('id',r.participant_ids);participantDetails=ps??[];for(const p of participantDetails){if(p.id_path)evidence.push(p.id_path);if(p.selfie_path)evidence.push(p.selfie_path);}}
   const signed=await db.storage.from('participant-evidence').createSignedUrls(evidence,120);check(signed);
   const media=body.kind==='content'?await db.storage.from(r.bucket).createSignedUrl(r.storage_path,120):{data:null};
   const {data:uploader}=body.kind==='content'?await db.from('creator_verifications').select('legal_first_name,legal_last_name,date_of_birth,id_front_path,id_back_path,selfie_path,document_bucket').eq('user_id',r.creator_id).order('submitted_at',{ascending:false}).order('id',{ascending:false}).limit(1).maybeSingle():{data:null};
   const uploaderDocs=uploader?await db.storage.from(uploader.document_bucket).createSignedUrls([uploader.id_front_path,uploader.id_back_path,uploader.selfie_path].filter(Boolean),120):{data:[],error:null};check(uploaderDocs);
   return json({documents:[...(signed.data??[]),...(uploaderDocs.data??[])],media:media.data?.signedUrl,consents,participants:participantDetails.map(({id_path,selfie_path,...p})=>p),uploader:uploader?{name:[uploader.legal_first_name,uploader.legal_last_name].join(' '),dob:uploader.date_of_birth}:null});
  }
  if(body.action==='decide'){
   if(!admin)return json({error:'Administrator required'},403);
   const result=await db.rpc('review_participant_content',{_id:body.id,_kind:body.kind,_status:body.status,_notes:String(body.notes??'').slice(0,1000),_reviewer:uid,_confirmed:body.confirmed===true});check(result);return json({success:true});
  }
  return json({error:'Unknown request'},400);
 }catch(e){return json({error:e instanceof Error?e.message:'Unable to complete review'},400);}
});