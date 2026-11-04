import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { deliveryUrl } from '../_shared/bunnyStream.ts';
const schema=z.object({paths:z.array(z.string().max(300)).min(1).max(24)});
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 try{
  const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!url||!key)return json({error:'Unavailable'},503);
  const token=req.headers.get('Authorization')?.replace(/^Bearer /,'');if(!token)return json({error:'Sign in required'},401);
  const db=createClient(url,key);const {data:claims,error}=await db.auth.getClaims(token);if(error||!claims?.claims?.sub)return json({error:'Sign in required'},401);
  const parsed=schema.safeParse(await req.json());if(!parsed.success)return json({error:'Invalid media request'},400);
  const caller=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')??'',{global:{headers:{Authorization:`Bearer ${token}`}}});
  const items=await Promise.all(parsed.data.paths.map(async path=>{
   if(path.includes('..'))return {path,signedUrl:null};
   // Original-object RLS checks entry access, ownership and current content clearance.
   const {data,error}=await caller.storage.from('teasers').createSignedUrl(path,300);
   if(error||!data?.signedUrl)return {path,signedUrl:null};
   try{return {path,signedUrl:await deliveryUrl(db,'teasers',path,300)??data.signedUrl};}catch{return {path,signedUrl:null};}
  }));
  return json({items,link_seconds:300});
 }catch{return json({error:'Playback unavailable'},503);}
});