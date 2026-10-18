export interface MetricsMonth {month:string;earned:number}
export function revenueChart(months: MetricsMonth[], now = new Date()) {
 return Array.from({length:6},(_,i)=>{
  const date=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-5+i,1));
  const key=date.toISOString().slice(0,7);
  return {month:date.toLocaleString('en',{month:'short',timeZone:'UTC'}),earned:Number(months.find(m=>m.month===key)?.earned)||0,withdrawn:0};
 });
}
