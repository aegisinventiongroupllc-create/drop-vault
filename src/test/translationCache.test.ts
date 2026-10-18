import {describe,it,expect} from 'vitest';
import {sanitizeTranslations} from '@/lib/translationCache';
describe('bounded translation cache',()=>{
 it('rejects malformed cache values',()=>{expect(sanitizeTranslations(null)).toEqual({});expect(sanitizeTranslations({a:22,b:'Bonjour'})).toEqual({b:'Bonjour'});});
 it('keeps at most the bounded latest entries',()=>{expect(sanitizeTranslations({a:'A',b:'B',c:'C'},2)).toEqual({b:'B',c:'C'});});
});