import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";
const json = (body: unknown, status=200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type":"application/json" } });
const schema = z.discriminatedUnion("action", [
 z.object({ action:z.literal("list"), filter:z.enum(["pending","flagged","approved","rejected","all"]).default("pending"), offset:z.number().int().min(0).max(100000).default(0), country:z.string().regex(/^[A-Z]{2}$/).optional(), query:z.string().trim().max(100).default("") }),
 z.object({ action:z.literal("export"), filter:z.enum(["pending","flagged","approved","rejected","all"]).default("pending"), offset:z.number().int().min(0).max(100000).default(0), country:z.string().regex(/^[A-Z]{2}$/).optional(), query:z.string().trim().max(100).default("") }),
 z.object({ action:z.literal("signed_urls"), id:z.string().uuid() }),
 z.object({ action:z.literal("decide"), id:z.string().uuid(), status:z.enum(["approved","rejected","flagged"]), notes:z.string().trim().max(1000).default(""), confirmed:z.boolean().default(false) })
]);
Deno.serve(async req => {
 if(req.method==="OPTIONS") return new Response("ok",{headers:corsHeaders});
 if(req.method!=="POST") return json({error:"Method not allowed"},405);
 try {
 const url=Deno.env.get("SUPABASE_URL"),anonKey=Deno.env.get("SUPABASE_ANON_KEY"),serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!anonKey||!serviceKey) return json({error:"Review service configuration unavailable"},503);
 const authorization=req.headers.get("authorization")??"";
 const client=createClient(url,anonKey,{global:{headers:{Authorization:authorization}}});
 const {data:{user},error:authError}=await client.auth.getUser();
 if(authError||!user) return json({error:"Administrator account sign-in required"},401);
 const {data:admin,error:roleError}=await client.rpc("has_role",{_user_id:user.id,_role:"admin"});
 if(roleError||admin!==true) return json({error:"Administrator privileges required"},403);
 const parsed=schema.safeParse(await req.json());
 if(!parsed.success) return json({error:"Invalid review request"},400);
 const body=parsed.data;
 const service=createClient(url,serviceKey);
 if(body.action==="list" || body.action==="export") {
 const columns="id,user_id,legal_first_name,legal_last_name,date_of_birth,id_front_path,id_back_path,selfie_path,status,reviewer_notes,reviewed_at,submitted_at,country,creator_username,document_expires_on,document_type,issuing_country";
 let query=service.from("creator_verifications").select(body.action==="export"?`${columns},document_number,reviewer_id,identity_confirmed`:columns,{count:"exact"}).order("country").order("legal_first_name").order("submitted_at",{ascending:false}).order("id");
 if(body.filter!=="all") query=query.eq("status",body.filter);
 if(body.country) query=query.eq("country",body.country);
 if(body.query) { const search=body.query.replace(/[^\p{L}\p{N}@ _-]/gu,""); if(search) query=query.or(`legal_first_name.ilike.%${search}%,legal_last_name.ilike.%${search}%,creator_username.ilike.%${search}%`); }
 const {data,error,count}=await query.range(body.offset,body.offset+24);
 if(error) return json({error:"Unable to load records"},500);
 if(body.action==="export") {
 const recordIds=(data??[]).map(row=>row.id);
 const creatorIds=[...new Set((data??[]).map(row=>row.user_id))];
 const {data:events,error:eventError}=await service.from("creator_identity_events").select("*").in("verification_id",recordIds).order("created_at").limit(1000);
 const {data:manifests,error:manifestError}=await service.from("content_manifests").select("id,creator_id,title,recorded_on,participant_ids,status,created_at").in("creator_id",creatorIds).limit(1000);
 if(eventError||manifestError)return json({error:"Audit records unavailable"},500);
 const logged=await service.from("activity_logs").insert({user_id:user.id,user_role:"admin",action_type:"identity_audit_export",action_detail:"Exported private identity review page",metadata:{verification_ids:recordIds,offset:body.offset},activity_date:new Date().toISOString().slice(0,10)});
 if(logged.error)return json({error:"Could not record export access"},500);
 return json({exported_at:new Date().toISOString(),records:data??[],events:events??[],content_references:manifests??[],total:count??0,offset:body.offset,reference_limit:1000,notice:"Private records; not a certificate of legal compliance. Content and event references are capped at 1000 each."});
 }
 const ids=[...new Set((data??[]).map(row=>row.user_id))];
 const {data:profiles}=ids.length?await service.from("profiles").select("user_id,email,display_name,country").in("user_id",ids):{data:[]};
 const byId=new Map((profiles??[]).map(p=>[p.user_id,p]));
 return json({rows:(data??[]).map(row=>({...row,email:byId.get(row.user_id)?.email,display_name:row.creator_username??byId.get(row.user_id)?.display_name,country:row.country??byId.get(row.user_id)?.country})),total:count??0});
 }
 if(body.action==="signed_urls") {
 const {data:row,error}=await service.from("creator_verifications").select("user_id,document_bucket,id_front_path,id_back_path,selfie_path").eq("id",body.id).single();
 if(error||!row) return json({error:"Record not found"},404);
 if(!["identity-documents","id-verifications","creator-2257-records"].includes(row.document_bucket)) return json({error:"Invalid evidence bucket"},400);
 const paths=[row.id_front_path,row.id_back_path,row.selfie_path].filter(path=>!!path&&path.startsWith(`${row.user_id}/`));
 const logged=await service.from("activity_logs").insert({user_id:user.id,user_role:"admin",action_type:"identity_document_view",action_detail:"Opened private creator identity evidence",metadata:{verification_id:body.id},activity_date:new Date().toISOString().slice(0,10)});
 if(logged.error)return json({error:"Could not record private document access"},500);
 const {data,error:signError}=await service.storage.from(row.document_bucket).createSignedUrls(paths,300);
 if(signError) return json({error:"Unable to open private images"},500);
 return json({urls:Object.fromEntries((data??[]).filter(item=>item.signedUrl).map(item=>[item.path,item.signedUrl]))});
 }
 const {data:creatorId,error}=await client.rpc("review_creator_identity",{_id:body.id,_status:body.status,_notes:body.notes,_confirmed:body.confirmed});
 if(error) return json({error:error.message},400);
 const {data:profile}=await service.from("profiles").select("email,display_name").eq("user_id",creatorId).maybeSingle();
 let notification="unavailable";
 if(body.status!=="flagged" && profile?.email) {
 try { const result=await sendTemplateEmail(body.status==="approved"?"creator-approved":"creator-declined",profile.email,{templateData:{name:profile.display_name??undefined,reason:body.notes},idempotencyKey:`creator-review-${body.id}-${body.status}`}); notification=result.sent?"sent":"suppressed"; }
 catch {notification="failed";}
 }
 return json({ok:true,notification});
 } catch {return json({error:"Unable to process verification request"},500);}
});
