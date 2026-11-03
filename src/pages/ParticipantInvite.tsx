import { useEffect,useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { participantCall } from '@/lib/participantReview';
export default function ParticipantInvite(){
 const [token]=useState(()=>window.location.hash.slice(1)),[info,setInfo]=useState<{label:string;consent:string;manifest?:{title:string;bucket:string;recorded_on:string;id:string}}>();
 const [name,setName]=useState(''),[dob,setDob]=useState(''),[aliases,setAliases]=useState(''),[country,setCountry]=useState(''),[agreed,setAgreed]=useState(false),[busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState('');
 const [files,setFiles]=useState<Record<string,File>>({});
 useEffect(()=>{window.history.replaceState(null,'',window.location.pathname);void participantCall({action:'invitation',token}).then(setInfo).catch(e=>setError(e.message));},[token]);
 const submit=async(link=false)=>{
  setBusy(true);setError('');try{
   const encoded:Record<string,{type:string;base64:string}>={};
   if(!link){for(const slot of info?.manifest?['id','selfie','release']:['id','selfie']){const file=files[slot];if(!file||file.size>10*1024*1024)throw new Error('Each required document must be under 10 MB');const base64=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=reject;r.readAsDataURL(file);});encoded[slot]={type:file.type,base64};}}
   await participantCall({action:link?'link-creator':'guest-submit',token,legal_name:name,dob,aliases,country,agreed,files:encoded});setFiles({});setDone(true);
  }catch(e){setError(e instanceof Error?e.message:'Submission failed. Ask the creator for a new invitation before retrying.');}finally{setBusy(false);}
 };
 return <main className="mx-auto max-w-2xl px-4 py-20 space-y-5"><Helmet><title>DTT Private Participant Review</title><meta name="robots" content="noindex,nofollow"/><meta name="referrer" content="no-referrer"/></Helmet><h1 className="text-2xl font-bold text-gold">DTT · PRIVATE PARTICIPANT REVIEW</h1>
 {done?<p role="status" className="text-success">Submitted for administrator review. This does not publish content or create a public creator profile.</p>:info&&<><p className="text-muted-foreground">Invitation for {info.label}. Your ID documents are visible only to authorized DTT administrators, not the inviting creator or customers.</p>
 {info.manifest&&<div className="space-y-2"><h2 className="font-semibold">{info.manifest.title}</h2><p className="text-sm">Content reference: {info.manifest.id}<br/>Use: {info.manifest.bucket}<br/>Recorded: {info.manifest.recorded_on}</p><p className="text-sm">Review the exact video or photo with the uploader before signing. If you cannot identify it, do not agree.</p></div>}
 <label className="block">Full legal name<Input value={name} maxLength={160} onChange={e=>setName(e.target.value)}/></label><label className="block">Date of birth<Input type="date" value={dob} onChange={e=>setDob(e.target.value)}/></label><label className="block">Other names / stage names<Input value={aliases} maxLength={500} onChange={e=>setAliases(e.target.value)}/></label><label className="block">Country code<Input value={country} maxLength={2} onChange={e=>setCountry(e.target.value.toUpperCase())}/></label>
 {(info.manifest?['id','selfie','release']:['id','selfie']).map(slot=><label key={slot} className="block text-sm">{slot==='id'?'Government photo ID':slot==='selfie'?'Holding photo with ID and handwritten DTT, today’s date and invitation label':'Signed permission identifying this exact content'}<input type="file" accept={slot==='release'?'image/jpeg,image/png,image/webp,application/pdf':'image/jpeg,image/png,image/webp'} className="block w-full mt-2" onChange={e=>{const f=e.target.files?.[0];if(f)setFiles(prev=>({...prev,[slot]:f}));}}/></label>)}
 <p className="text-sm text-muted-foreground">{info.manifest?info.consent:'I consent to private identity review by DTT Media LLC for participation in the inviting creator’s content. Identity approval alone does not authorize distribution of any particular content.'}</p>
 <label className="flex gap-3 text-sm"><Checkbox checked={agreed} onCheckedChange={v=>setAgreed(v===true)}/>I am the invited participant and voluntarily agree to the statement above.</label>
 {info.manifest&&<Button variant="outline" onClick={()=>window.print()}>PRINT DRAFT RELEASE</Button>}
 <Button variant="neon" disabled={busy||!agreed} onClick={()=>void submit()}>SUBMIT PRIVATE RECORDS</Button>
 {!info.manifest&&<Button variant="outline" disabled={busy} onClick={()=>void submit(true)}>USE MY SIGNED-IN VERIFIED CREATOR IDENTITY</Button>}
 <p className="text-xs text-muted-foreground">Draft permission wording requires qualified legal review. Missing original production-age records cannot be repaired by a new ID or signature alone. Questions or disputed content: admin@dttmediallc.com.</p></>}
 {error&&<p role="alert" className="text-destructive">{error}</p>}</main>;
}