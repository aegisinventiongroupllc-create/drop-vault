import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
export async function affirmAgeConsent(method: "entry"|"checkout"|"registration"): Promise<string> {
  const {data,error}=await supabase.functions.invoke("age-consent",{body:{action:"affirm",method,confirmed:true}});
  if(error){const body=error instanceof FunctionsHttpError?await error.context.json().catch(()=>null):null;throw new Error(body?.error??"Your consent could not be saved. Please retry.");}
  if(typeof data?.receipt!=="string")throw new Error("Consent receipt unavailable");
  return data.receipt;
}
export async function verifyEntryConsent(): Promise<boolean> {
  try {
    const receipt=localStorage.getItem("dtt_age_consent_receipt");if(!receipt)return false;
    const {data,error}=await supabase.functions.invoke("age-consent",{body:{action:"verify",receipt}});
    return !error&&data?.valid===true;
  } catch{return false;}
}