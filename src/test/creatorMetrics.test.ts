import {describe,it,expect} from 'vitest';
import {revenueChart} from '@/lib/creatorMetrics';
describe('UTC complete revenue chart',()=>{
 it('distinguishes January across years',()=>{const chart=revenueChart([{month:'2025-01',earned:99},{month:'2026-01',earned:18}],new Date('2026-01-31T23:00:00Z'));expect(chart[5].earned).toBe(18);expect(chart).toHaveLength(6);});
 it('does not cap server totals',()=>{expect(revenueChart([{month:'2026-10',earned:18018}],new Date('2026-10-18T00:00:00Z'))[5].earned).toBe(18018);});
});
