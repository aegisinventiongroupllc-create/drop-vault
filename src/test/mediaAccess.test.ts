import {it,expect} from 'vitest';
import {playbackLifetime} from '@/lib/mediaAccess';
const now=Date.parse('2026-10-18T19:00:00Z');
it('never grants a playback link beyond subscription expiry',()=>{expect(playbackLifetime('2026-10-18T19:00:30Z',now)).toBe(30);});
it('denies expired or invalid access',()=>{expect(playbackLifetime('2026-10-18T18:59:59Z',now)).toBe(0);expect(playbackLifetime('invalid',now)).toBe(0);});
it('caps signed playback at one hour',()=>{expect(playbackLifetime('2026-10-19T19:00:00Z',now)).toBe(3600);expect(playbackLifetime(null,now)).toBe(3600);});