import { forwardRef, useEffect, useRef, type VideoHTMLAttributes } from 'react';
import Hls from 'hls.js';
// Shared HTML video surface preserves existing controls, refs and teaser gates.
const ProtectedVideo=forwardRef<HTMLVideoElement,VideoHTMLAttributes<HTMLVideoElement>>(function ProtectedVideo({src,...props},forwardedRef){
 const ref=useRef<HTMLVideoElement|null>(null);
 useEffect(()=>{
  const video=ref.current;if(!video)return;
  if(!src){video.pause();video.removeAttribute('src');video.load();return;}
  const time=video.currentTime,playing=!video.paused;
  const restore=()=>{if(time>0)video.currentTime=time;if(playing)void video.play().catch(()=>{});};
  video.addEventListener('loadedmetadata',restore,{once:true});
  let hls:Hls|undefined;
  if(src.includes('playlist.m3u8')&&Hls.isSupported()){
   hls=new Hls({maxBufferLength:30});hls.loadSource(src);hls.attachMedia(video);
  }else video.src=src;
  return()=>{video.removeEventListener('loadedmetadata',restore);hls?.destroy();};
 },[src]);
 return <video {...props} ref={element=>{ref.current=element;if(typeof forwardedRef==='function')forwardedRef(element);else if(forwardedRef)forwardedRef.current=element;}} />;
});
export default ProtectedVideo;