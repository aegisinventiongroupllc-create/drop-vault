import { act, renderHook } from '@testing-library/react';
import { describe,it,expect,vi } from 'vitest';
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getUser:vi.fn(async()=>({data:{user:null}}))}}}));
vi.mock('react',async()=>{
 const actual=await vi.importActual<typeof import('react')>('react');
 return {...actual,useState:(initial:unknown)=>{
  const old={...(initial as Record<string,unknown>)};
  delete old.escrowHeldUsd;delete old.nextReleaseAt;
  return actual.useState(old);
 }};
});
import { useCreatorStats } from '@/hooks/useCreatorStats';
describe('creator stats preserved pre-escrow state',()=>{
 it('supplies zero held funds and a null release date before the refresh finishes',async()=>{
  const {result}=renderHook(()=>useCreatorStats());
  expect(result.current.escrowHeldUsd).toBe(0);
  expect(result.current.escrowHeldUsd.toFixed(2)).toBe('0.00');
  expect(result.current.nextReleaseAt).toBe(null);
  await act(async()=>{await Promise.resolve();});
 });
});