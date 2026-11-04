import { Upload } from 'tus-js-client';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
export async function bunnyUploadAction(action:string,bucket:string,path:string,mediaId?:string) {
 const {data,error}=await supabase.functions.invoke('bunny-upload',{body:{action,bucket,path,media_id:mediaId}});
 if(error){const details=error instanceof FunctionsHttpError?await error.context.json().catch(()=>null):null;throw new Error(details?.error??error.message);}
 if(data?.error)throw new Error(data.error);
 return data;
}
export async function uploadBunnyCopy(bucket:string,path:string,file:File,onProgress?:(message:string,percent:number)=>void){
 const auth=await bunnyUploadAction('start',bucket,path);
 await new Promise<void>((resolve,reject)=>{
  const upload=new Upload(file,{
   endpoint:'https://video.bunnycdn.com/tusupload',
   headers:{AuthorizationSignature:auth.signature,AuthorizationExpire:String(auth.expires),LibraryId:String(auth.library_id),VideoId:auth.video_id},
   chunkSize:6*1024*1024,retryDelays:[0,1000,3000,5000,10000],removeFingerprintOnSuccess:true,
   fingerprint:async()=>`bunny:${auth.video_id}:${file.size}:${file.lastModified}`,
   metadata:{filetype:file.type,title:'DTT watermarked video'},
   onProgress:(sent,total)=>onProgress?.('Saving protected video…',Math.round(sent/total*100)),
   onSuccess:()=>resolve(),onError:()=>reject(new Error('Video transfer interrupted. Please retry.')),
  });
  upload.findPreviousUploads().then(previous=>{if(previous[0])upload.resumeFromPreviousUpload(previous[0]);upload.start();}).catch(reject);
 });
 await bunnyUploadAction('complete',bucket,path);
}