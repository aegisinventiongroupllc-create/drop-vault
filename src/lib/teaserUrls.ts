import { supabase } from '@/integrations/supabase/client';
export async function signTeasers(paths:string[]):Promise<{data:{path:string;signedUrl:string}[];error:Error|null}>{
 if(!paths.length)return {data:[],error:null};
 const rows:{path:string;signedUrl:string}[]=[];
 for(let offset=0;offset<paths.length;offset+=24){
  const {data,error}=await supabase.functions.invoke('teaser-media',{body:{paths:paths.slice(offset,offset+24)}});
  if(error)return {data:rows,error:new Error('Teaser playback unavailable')};
  rows.push(...(data?.items??[]).filter((row:{signedUrl:string|null})=>!!row.signedUrl));
 }
 return {data:rows,error:null};
}
export async function signTeaser(path:string){const result=await signTeasers([path]);return {data:result.data[0]??null,error:result.error};}