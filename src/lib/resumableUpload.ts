import { Upload } from 'tus-js-client';
import { supabase } from '@/integrations/supabase/client';

// Input must already have passed the permanent watermark encoder.
export async function uploadBrandedFile(bucket:string,path:string,file:File,onProgress?:(message:string,percent:number)=>void,signal?:AbortSignal):Promise<{error:{message:string}|null}> {
 if(signal?.aborted)return {error:{message:'Upload cancelled'}};
 if(file.size<6*1024*1024) {
  try{return await supabase.storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false});}
  catch{return {error:{message:'Connection interrupted. Please retry the upload.'}};}
 }
 const {data,error}=await supabase.auth.getSession();
 if(signal?.aborted)return {error:{message:'Upload cancelled'}};
 if(error||!data.session)return {error:{message:'Sign in to upload.'}};
 const endpoint=`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/upload/resumable`;
 return new Promise(resolve=>{
  let done=false;
  const finish=(error:{message:string}|null)=>{if(done)return;done=true;signal?.removeEventListener('abort',cancel);resolve({error});};
  const upload=new Upload(file,{
   endpoint,headers:{authorization:`Bearer ${data.session.access_token}`,'x-upsert':'false'},
   chunkSize:6*1024*1024,retryDelays:[0,1000,3000,5000],uploadDataDuringCreation:true,removeFingerprintOnSuccess:true,
   fingerprint:async()=>`${bucket}:${path}:${file.size}:${file.lastModified}`,
   metadata:{bucketName:bucket,objectName:path,contentType:file.type,cacheControl:'3600'},
   onBeforeRequest:async request=>{const {data}=await supabase.auth.getSession();if(data.session)request.setHeader('authorization',`Bearer ${data.session.access_token}`);},
   onProgress:(sent,total)=>onProgress?.('Saving watermarked media…',Math.round(sent/total*100)),
   onSuccess:()=>finish(null),onError:()=>finish({message:'Upload interrupted after retries. Please try again.'})
  });
  const cancel=()=>{void upload.abort(true).catch(()=>{});finish({message:'Upload cancelled'});};
  signal?.addEventListener('abort',cancel,{once:true});
  upload.findPreviousUploads().then(previous=>{if(done)return;if(previous[0])upload.resumeFromPreviousUpload(previous[0]);upload.start();}).catch(()=>finish({message:'Couldn’t start the upload. Please retry.'}));
 });
}