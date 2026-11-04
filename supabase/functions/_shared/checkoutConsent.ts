import { jwtVerify } from "npm:jose@5";
export async function checkoutConsentValid(server: any, receipt: unknown, userId: string): Promise<boolean> {
  const signing=Deno.env.get("DTT_CONSENT_SIGNING_KEY");
  if(!signing||typeof receipt!=="string"||receipt.length>4096)return false;
  try {
    const {payload}=await jwtVerify(receipt,new TextEncoder().encode(signing),{algorithms:["HS256"],issuer:"DTT",audience:"DTT-consent"});
    if(payload.method!=="checkout"||typeof payload.jti!=="string")return false;
    const {data,error}=await server.from("age_consent_receipts").select("user_id,method,created_at,expires_at,revoked_at,policy_version").eq("id",payload.jti).maybeSingle();
    return !error&&!!data&&data.user_id===userId&&data.method==="checkout"&&data.policy_version==="2.0"&&!data.revoked_at&&Date.now()-new Date(data.created_at).getTime()<10*60*1000&&new Date(data.expires_at).getTime()>Date.now();
  } catch{return false;}
}