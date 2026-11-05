import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
export async function bunnyUploadAction(action:string,bucket:string,path:string,mediaId?:string) {
 const {data,error}=await supabase.functions.invoke('bunny-upload',{body:{action,bucket,path,media_id:mediaId}});
 if(error){const details=error instanceof FunctionsHttpError?await error.context.json().catch(()=>null):null;throw new Error(details?.error??error.message);}
 if(data?.error)throw new Error(data.error);
 return data;
}
export async function uploadBunnyCopy(bucket:string,path:string,file:File,onProgress?:(message:string,percent:number)=>void){
 if(!file.type.startsWith('video/'))throw new Error('Video required');
 onProgress?.('Preparing protected video delivery…',95);
 await bunnyUploadAction('start',bucket,path);
 onProgress?.('Video saved. Processing protected playback…',100);
}