import { useEffect,useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { participantCall,invitationUrl,uploadParticipantEvidence } from '@/lib/participantReview';
import { supabase } from '@/integrations/supabase/client';
type Participant={id:string;label:string;status:string;reviewer_notes?:string};
type Manifest={id:string;title:string;bucket:string;storage_path:string;status:string;participant_ids:string[];reviewer_notes?:string};
export default function CreatorParticipants({userId}:{userId:string}){
 const [participants,setParticipants]=useState<Participant[]>([]),[manifests,setManifests]=useState<Manifest[]>([]);
 const [label,setLabel]=useState(''),[link,setLink]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [items,setItems]=useState<{bucket:string;path:string;title:string}[]>([]),[selected,setSelected]=useState(''),[date,setDate]=useState(''),[ids,setIds]=useState<string[]>([]),[complete,setComplete]=useState(false);
 const [production,setProduction]=useState<File>(),[rights,setRights]=useState<File>();const [offset,setOffset]=useState(0);
 const load=async()=>{
  try{const data=await participantCall({action:'list',own:true,offset});setParticipants(data.participants);setManifests(data.manifests);
   const [media,photos,requests,backdrop]=await Promise.all([supabase.from('creator_media').select('bucket,storage_path,title').eq('creator_id',userId).order('created_at',{ascending:false}).range(offset,offset+24),supabase.from('creator_profile_photos').select('storage_path').eq('creator_id',userId).range(offset,offset+24),supabase.from('custom_requests').select('delivery_path').eq('creator_id',userId).not('delivery_path','is',null).range(offset,offset+24),supabase.from('profile_backdrop_settings').select('upload_path').eq('user_id',userId)]);
   setItems([...(data.staged??[]).map((s:{bucket:string;name:string})=>({bucket:s.bucket,path:s.name,title:'Private staged content'})),...(media.data??[]).map(m=>({bucket:m.bucket,path:m.storage_path,title:m.title})),...(photos.data??[]).map(p=>({bucket:'creator-profile-photos',path:p.storage_path,title:'Profile portrait'})),...(requests.data??[]).flatMap(r=>r.delivery_path?[{bucket:'request-deliveries',path:r.delivery_path,title:'Request delivery'}]:[]),...(backdrop.data??[]).flatMap(b=>b.upload_path?[{bucket:'profile-backdrops',path:b.upload_path,title:'Uploaded backdrop'}]:[])].filter((v,i,a)=>a.findIndex(x=>x.bucket===v.bucket&&x.path===v.path)===i));
  }catch(e){setError(e instanceof Error?e.message:'Could not load participants');}
 };
 useEffect(()=>{void load();},[userId,offset]);
 const run=async(task:()=>Promise<void>)=>{setBusy(true);setError('');try{await task();await load();}catch(e){setError(e instanceof Error?e.message:'Request failed');}finally{setBusy(false);}};
 const submit=()=>run(async()=>{
  const item=items.find(i=>`${i.bucket}:${i.path}`===selected);if(!item||!date||!production||!rights||!complete)throw new Error('Select content, recording date, evidence and complete declaration');
  const production_path=await uploadParticipantEvidence(userId,production,'production'),rights_path=await uploadParticipantEvidence(userId,rights,'rights');
  await participantCall({action:'manifest',bucket:item.bucket,path:item.path,title:item.title,recorded_on:date,participant_ids:ids,complete,production_path,rights_path});setSelected('');
 });
 return <section className="space-y-5 py-5 border-t border-border"><h3 className="font-bold">PARTICIPANTS & CONTENT REVIEW</h3>
 <p className="text-sm text-muted-foreground">Every person appearing must be verified and 18+ when recorded, even if their face is hidden. Guests do not need a public DTT creator profile. A release alone is not age evidence.</p>
 <label className="block text-sm">Participant display label<Input value={label} maxLength={120} onChange={e=>setLabel(e.target.value)} /></label>
 <Button variant="outline" disabled={busy||label.trim().length<2} onClick={()=>run(async()=>{const data=await participantCall({action:'invite',label});setLink(invitationUrl(data.token));})}>INVITE PARTICIPANT</Button>
 {link&&<label className="block text-sm">Private invitation · expires in 72 hours<Input readOnly value={link}/><Button variant="outline" onClick={()=>navigator.clipboard.writeText(link)}>COPY PRIVATE LINK</Button></label>}
 <div className="divide-y divide-border">{participants.map(p=><div key={p.id} className="py-3"><p><span translate="no">{p.label}</span> · <span className="text-gold">{p.status}</span></p>{p.reviewer_notes&&<p translate="no" className="text-sm text-muted-foreground">{p.reviewer_notes}</p>}</div>)}</div>
 <h4 className="font-semibold">CONTENT CLEARANCE</h4>
 <p className="text-sm text-muted-foreground">New and older uploads stay private until review. Supply original age-at-production records and permission to distribute. If records are missing, do not offer that content.</p>
 <label className="block text-sm">Uploaded content<select aria-label="Uploaded content" className="w-full bg-secondary border border-border p-2 rounded-md" value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Select an uploaded item</option>{items.map(i=><option key={`${i.bucket}:${i.path}`} value={`${i.bucket}:${i.path}`}>{i.title} · {i.bucket} · {i.path.split('/').pop()}</option>)}</select></label>
 <label className="block text-sm">Recording date<Input type="date" value={date} max={new Date().toISOString().slice(0,10)} onChange={e=>setDate(e.target.value)}/></label>
 <p className="text-sm">Uploader included automatically. Select everyone else appearing:</p>
 {participants.filter(p=>p.status==='approved').map(p=><label key={p.id} className="flex gap-3 items-center text-sm"><Checkbox checked={ids.includes(p.id)} onCheckedChange={v=>setIds(prev=>v===true?[...prev,p.id]:prev.filter(id=>id!==p.id))}/>{p.label}</label>)}
 <label className="block text-sm">Original production identity / age records<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="block w-full" onChange={e=>setProduction(e.target.files?.[0])}/></label>
 <label className="block text-sm">Signed uploader distribution permission / rights records<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="block w-full" onChange={e=>setRights(e.target.files?.[0])}/></label>
 <label className="flex gap-3 text-sm"><Checkbox checked={complete} onCheckedChange={v=>setComplete(v===true)}/>I have listed every person appearing, including myself, and supplied genuine production and distribution records.</label>
 <Button variant="neon" disabled={busy||!complete} onClick={submit}>SUBMIT CONTENT FOR REVIEW</Button>
 <div className="divide-y divide-border">{manifests.map(m=><article key={m.id} className="py-3 space-y-2"><p>{m.title} · <span className="text-gold">{m.status}</span></p>{m.reviewer_notes&&<p className="text-sm text-muted-foreground">{m.reviewer_notes}</p>}{m.status!=='approved'&&m.participant_ids.map(id=><Button key={id} variant="outline" className="whitespace-normal h-auto" disabled={busy} onClick={()=>run(async()=>{const data=await participantCall({action:'consent-invite',manifest_id:m.id,participant_id:id});setLink(invitationUrl(data.token));})}>INVITE {participants.find(p=>p.id===id)?.label??'PARTICIPANT'} TO SIGN CONTENT CONSENT</Button>)}</article>)}</div>
 <div className="flex gap-3"><Button variant="outline" disabled={busy||offset===0} onClick={()=>setOffset(n=>Math.max(0,n-25))}>PREVIOUS</Button><Button variant="outline" disabled={busy} onClick={()=>setOffset(n=>n+25)}>NEXT</Button><Button variant="outline" disabled={busy} onClick={()=>void load()}>REFRESH</Button></div>
 {error&&<p role="alert" className="text-destructive">{error}</p>}
 </section>;
}