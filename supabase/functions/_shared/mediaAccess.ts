export function playbackLifetime(accessUntil:string|null,now=Date.now()):number {
 if(accessUntil===null)return 3600;
 const remaining=Math.floor((Date.parse(accessUntil)-now)/1000);
 return Number.isFinite(remaining)?Math.max(0,Math.min(3600,remaining)):0;
}