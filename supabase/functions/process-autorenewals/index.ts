import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {status, headers: {...corsHeaders, 'Content-Type':'application/json'}});
Deno.serve(async req => {
 if(req.method==='OPTIONS') return new Response('ok',{headers:corsHeaders});
 const secret=Deno.env.get('CRON_SECRET'); const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); const url=Deno.env.get('SUPABASE_URL');
 const bearer=(req.headers.get('Authorization')??'').replace(/^Bearer /,'');
 if(!((secret && req.headers.get('x-cron-secret')===secret)||(key && bearer===key))) return json({error:'Unauthorized'},401);
 if(!url || !key) return json({error:'Service unavailable'},503);
 const db=createClient(url,key); const now=new Date(); let warned=0,renewed=0,failed=0,skipped=0;
 try {
  // Bound warning writes; unfinished work remains eligible for the next hourly run.
  const {data:warnings,error:warningError}=await db.from('subscriptions').select('id').eq('status','active').eq('warned_24h',false).lte('expires_at',new Date(now.getTime()+86400000).toISOString()).gt('expires_at',now.toISOString()).order('expires_at').limit(200);
  if(warningError) throw warningError;
  if(warnings?.length){const {error}=await db.from('subscriptions').update({warned_24h:true}).in('id',warnings.map(w=>w.id)).eq('warned_24h',false); if(error) throw error; warned=warnings.length;}
  // Never offset a shrinking queue. Each atomic outcome removes or updates the due row.
  const attempted=new Set<string>();
  for(let batch=0;batch<5;batch++) {
   const {data:due,error}=await db.from('subscriptions').select('id,expires_at').eq('status','active').eq('autorenew',true).lte('expires_at',now.toISOString()).order('expires_at').order('id').limit(100);
   if(error) throw error;
   const pending=(due??[]).filter(s=>!attempted.has(s.id)); if(!pending.length) break;
   for(const sub of pending){attempted.add(sub.id);const {data,error}=await db.rpc('renew_subscription_atomic',{_subscription_id:sub.id,_expected_expiry:sub.expires_at});
    if(error){failed++;console.error('Renewal failed',{code:error.code});}else if(data==='renewed') renewed++;else if(data==='skipped') skipped++;else failed++;
   }
  }
  console.info('Renewal summary',{warned,renewed,failed,skipped});
  return json({ok:failed===0,warned,renewed,failed,skipped,ranAt:now.toISOString()},failed?207:200);
 }catch{console.error('Renewal job failed');return json({ok:false,error:'Renewal processing failed',warned,renewed,failed},500);}
});
