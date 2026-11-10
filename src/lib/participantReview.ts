import { supabase } from '@/integrations/supabase/client';
import { publicParticipantInvitationUrl } from '@/lib/publicBranding';
export { adultAtRecording, PARTICIPANT_CONSENT } from '../../supabase/functions/_shared/participantRules';
export async function participantCall(body: Record<string, unknown>) {
 const {data,error}=await supabase.functions.invoke('participant-review',{body});
 if(error||data?.error){let message=data?.error;if(!message&&error&&'context' in error&&error.context instanceof Response){try{message=(await error.context.json()).error;}catch{/* retain safe error */}}throw new Error(message??'Could not complete private review request');}return data;
}
export async function uploadParticipantEvidence(userId:string,file:File,slot:string){
 if(!['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type)||file.size<1||file.size>10*1024*1024)throw new Error('Choose an image or PDF under 10 MB');
 const path=`${userId}/${crypto.randomUUID()}-${slot}`;
 const {error}=await supabase.storage.from('participant-evidence').upload(path,file,{contentType:file.type,upsert:false});if(error)throw error;return path;
}
export const invitationUrl = publicParticipantInvitationUrl;