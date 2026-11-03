export function playbackLifetime(accessUntil:string|null,now=Date.now()):number {
 if(accessUntil===null)return 300;
 const remaining=Math.floor((Date.parse(accessUntil)-now)/1000);
 return Number.isFinite(remaining)?Math.max(0,Math.min(300,remaining)):0;
}