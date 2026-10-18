export function sanitizeTranslations(value:unknown,max=2000):Record<string,string> {
 if(!value||typeof value!=='object'||Array.isArray(value))return {};
 return Object.fromEntries(Object.entries(value).filter(([key,v])=>key.length<=600&&typeof v==='string'&&v.length>0&&v.length<=2400).slice(-max));
}