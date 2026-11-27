const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const SKIP = new Set(["EU","EZ","UN","ZZ","XA","XB","QO","AA","QM","XK"]);
/** ISO country list with English names, sorted by name. */
export function countryOptions(): { code: string; name: string }[] {
  const names = new Intl.DisplayNames(["en"], { type: "region", fallback: "none" });
  const list: { code: string; name: string }[] = [];
  for (const a of LETTERS) for (const b of LETTERS) {
    const code = a + b; if (SKIP.has(code)) continue;
    const name = names.of(code); if (name && name !== code) list.push({ code, name });
  }
  return list.sort((x, y) => x.name.localeCompare(y.name));
}
