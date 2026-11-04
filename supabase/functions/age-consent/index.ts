import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { SignJWT, jwtVerify } from "npm:jose@5";
import { z } from "npm:zod@3";
const schema=z.discriminatedUnion("action",[
  z.object({action:z.literal("affirm"),method:z.enum(["entry","checkout","registration"]),confirmed:z.literal(true)}),
  z.object({action:z.literal("verify"),receipt:z.string().min(1).max(4096)}),
]);
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  try {
    const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),signing=Deno.env.get("DTT_CONSENT_SIGNING_KEY");
    if(!url||!key||!signing)return json({error:"Consent service unavailable"},503);
    const parsed=schema.safeParse(await req.json());if(!parsed.success)return json({error:"Age and Terms affirmation required"},400);
    const server=createClient(url,key);
    const bearer=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
    const {data}=bearer?await server.auth.getUser(bearer):{data:{user:null}};
    const secret=new TextEncoder().encode(signing);
    const body=parsed.data;
    if(body.action==="verify") {
      try {
        const {payload}=await jwtVerify(body.receipt,secret,{algorithms:["HS256"],issuer:"DTT",audience:"DTT-consent"});
        const {data:record,error}=await server.from("age_consent_receipts").select("user_id,method,expires_at,revoked_at,policy_version").eq("id",payload.jti).maybeSingle();
        const valid=!error&&!!record&&!record.revoked_at&&record.policy_version==="2.0"&&new Date(record.expires_at)>new Date()&&(!record.user_id||record.user_id===data.user?.id);
        return json({valid});
      } catch{return json({valid:false});}
    }
    if(body.method==="checkout"&&!data.user)return json({error:"Account sign-in required"},401);
    const consentText=body.method==="checkout"?"I affirm I am at least 18 and the age of majority in my jurisdiction, the funds are mine and lawful, and I accept the Terms, Privacy, Refund, AML/KYC and Risk Disclosure policies. Payment verification is required for digital access. Non-waivable refund rights remain applicable.":"I affirm I am at least 18 and the age of majority in my jurisdiction and agree to DTT Terms and required entry declarations.";
    const logged=await server.from("legal_consents").insert({user_id:data.user?.id??null,terms_version:"2.0",consent_type:`${body.method}_age_affirmation`,consent_text:consentText,user_agent:req.headers.get("user-agent")?.slice(0,512)??null});
    if(logged.error)return json({error:"Could not save your consent. Please retry."},500);
    const {data:record,error}=await server.from("age_consent_receipts").insert({user_id:data.user?.id??null,method:body.method}).select("id,expires_at").single();
    if(error||!record)return json({error:"Could not issue consent receipt"},500);
    const receipt=await new SignJWT({method:body.method,policy:"2.0"}).setProtectedHeader({alg:"HS256"}).setIssuer("DTT").setAudience("DTT-consent").setJti(record.id).setIssuedAt().setExpirationTime(Math.floor(new Date(record.expires_at).getTime()/1000)).sign(secret);
    return json({receipt,expires_at:record.expires_at,age_assurance:false});
  } catch{return json({error:"Consent service could not complete this request"},500);}
});