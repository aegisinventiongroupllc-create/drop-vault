import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { revenueChart, type MetricsMonth } from '@/lib/creatorMetrics';
export interface CreatorStat {label:string;value:string;change:string}
export interface RevenueMonth {month:string;earned:number;withdrawn:number}
export interface TopFan {rank:number;name:string;spent:number}
export interface CreatorLiveStats {loading:boolean;creatorId:string|null;followerCount:number;totalViews:number;bitTokenRevenue:number;growthRate:number;totalEarnedUsd:number;totalPaidUsd:number;pendingBalanceUsd:number;revenueByMonth:RevenueMonth[];topFans:TopFan[]}
const defaults:CreatorLiveStats={loading:true,creatorId:null,followerCount:0,totalViews:0,bitTokenRevenue:0,growthRate:0,totalEarnedUsd:0,totalPaidUsd:0,pendingBalanceUsd:0,revenueByMonth:revenueChart([]),topFans:[]};
export function useCreatorStats():CreatorLiveStats {
 const [state,setState]=useState(defaults);
 useEffect(()=>{
  let cancelled=false;let timer:ReturnType<typeof setTimeout>|undefined;let running=false;let rerun=false;
  let channel:ReturnType<typeof supabase.channel>|undefined;
  const start=async()=>{
   const {data}=await supabase.auth.getUser();const uid=data.user?.id;
   if(!uid){if(!cancelled)setState({...defaults,loading:false});return;}
   const load=async()=>{
    if(cancelled)return;if(running){rerun=true;return;}running=true;
    try{
     const [wallet,metrics,hearts]=await Promise.all([
      supabase.from('creator_wallets').select('total_earned,total_paid,pending_balance').eq('user_id',uid).maybeSingle(),
      supabase.rpc('get_my_creator_metrics'),
      supabase.from('creator_heart_totals').select('hearts').eq('creator_id',uid).maybeSingle()
     ]);
     if(wallet.error||metrics.error||hearts.error)throw Error('Metrics unavailable');
     const result=metrics.data as unknown as {total_views:number;months:MetricsMonth[];fans:TopFan[]};
     const months=revenueChart(result.months??[]);const current=months[5].earned,previous=months[4].earned;
     if(!cancelled)setState({loading:false,creatorId:uid,followerCount:Number(hearts.data?.hearts)||0,totalViews:Number(result.total_views)||0,bitTokenRevenue:Number(wallet.data?.total_earned||0)/20,growthRate:previous>0?Math.round((current-previous)/previous*100):0,totalEarnedUsd:Number(wallet.data?.total_earned)||0,totalPaidUsd:Number(wallet.data?.total_paid)||0,pendingBalanceUsd:Number(wallet.data?.pending_balance)||0,revenueByMonth:months,topFans:result.fans??[]});
    }catch{if(!cancelled)setState(s=>({...s,loading:false}));}finally{running=false;if(rerun){rerun=false;schedule();}}
   };
   const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>void load(),400);};
   await load();if(cancelled)return;
   channel=supabase.channel(`creator-stats-${uid}`)
    .on('postgres_changes',{event:'*',schema:'public',table:'transactions',filter:`creator_id=eq.${uid}`},schedule)
    .on('postgres_changes',{event:'*',schema:'public',table:'creator_media',filter:`creator_id=eq.${uid}`},schedule)
    .on('postgres_changes',{event:'*',schema:'public',table:'creator_wallets',filter:`user_id=eq.${uid}`},schedule)
    .on('postgres_changes',{event:'*',schema:'public',table:'creator_heart_totals',filter:`creator_id=eq.${uid}`},schedule)
    .subscribe(status=>{if(status==='SUBSCRIBED')schedule();});
  };
  void start();return()=>{cancelled=true;clearTimeout(timer);if(channel)void supabase.removeChannel(channel);};
 },[]);return state;
}
