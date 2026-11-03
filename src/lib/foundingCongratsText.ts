/** Hand-written congratulations copy per language; {n} slot, {c} country, {s} split, {d} end date. */
type Copy = { title: string; woman: string; man: string; body: string; button: string };
export const FOUNDING_CONGRATS: Record<string, Copy> = {
  en: { title: "CONGRATULATIONS!", woman: "You are founding woman creator #{n} in {c}.", man: "You are founding man creator #{n} in {c}.", body: "You keep {s} until {d}, then 90/10.", button: "LET'S GO" },
  es: { title: "¡FELICIDADES!", woman: "Eres la creadora fundadora n.º {n} en {c}.", man: "Eres el creador fundador n.º {n} en {c}.", body: "Conservas {s} hasta el {d}; después, 90/10.", button: "¡VAMOS!" },
  fr: { title: "FÉLICITATIONS !", woman: "Tu es la créatrice fondatrice n° {n} en {c}.", man: "Tu es le créateur fondateur n° {n} en {c}.", body: "Tu gardes {s} jusqu'au {d}, puis 90/10.", button: "C'EST PARTI" },
  pt: { title: "PARABÉNS!", woman: "Você é a criadora fundadora n.º {n} em {c}.", man: "Você é o criador fundador n.º {n} em {c}.", body: "Você mantém {s} até {d}; depois, 90/10.", button: "VAMOS LÁ" },
  "pt-br": { title: "PARABÉNS!", woman: "Você é a criadora fundadora nº {n} em {c}.", man: "Você é o criador fundador nº {n} em {c}.", body: "Você fica com {s} até {d}; depois, 90/10.", button: "BORA" },
  de: { title: "HERZLICHEN GLÜCKWUNSCH!", woman: "Du bist Gründungs-Creatorin Nr. {n} in {c}.", man: "Du bist Gründungs-Creator Nr. {n} in {c}.", body: "Du behältst {s} bis {d}, danach 90/10.", button: "LOS GEHT'S" },
  it: { title: "CONGRATULAZIONI!", woman: "Sei la creator fondatrice n. {n} in {c}.", man: "Sei il creator fondatore n. {n} in {c}.", body: "Mantieni {s} fino al {d}, poi 90/10.", button: "ANDIAMO" },
  nl: { title: "GEFELICITEERD!", woman: "Je bent oprichtende creator (vrouw) #{n} in {c}.", man: "Je bent oprichtende creator (man) #{n} in {c}.", body: "Je houdt {s} tot {d}, daarna 90/10.", button: "AAN DE SLAG" },
  tr: { title: "TEBRİKLER!", woman: "{c} ülkesinde #{n} numaralı kurucu kadın içerik üreticisisin.", man: "{c} ülkesinde #{n} numaralı kurucu erkek içerik üreticisisin.", body: "{d} tarihine kadar {s} kazanırsın, ardından 90/10.", button: "HADİ BAŞLAYALIM" },
  ru: { title: "ПОЗДРАВЛЯЕМ!", woman: "Вы — основательница-автор №{n} в стране {c}.", man: "Вы — основатель-автор №{n} в стране {c}.", body: "Вы сохраняете {s} до {d}, затем 90/10.", button: "ВПЕРЁД" },
  ar: { title: "تهانينا!", woman: "أنتِ المبدعة المؤسِّسة رقم {n} في {c}.", man: "أنت المبدع المؤسِّس رقم {n} في {c}.", body: "تحتفظ بنسبة {s} حتى {d}، ثم 90/10.", button: "هيا بنا" },
  hi: { title: "बधाई हो!", woman: "आप {c} में संस्थापक महिला क्रिएटर #{n} हैं।", man: "आप {c} में संस्थापक पुरुष क्रिएटर #{n} हैं।", body: "{d} तक आपको {s} मिलेगा, उसके बाद 90/10।", button: "चलिए शुरू करें" },
  ja: { title: "おめでとうございます！", woman: "あなたは{c}の創設女性クリエイター第{n}号です。", man: "あなたは{c}の創設男性クリエイター第{n}号です。", body: "{d}まで{s}、その後は90/10です。", button: "はじめよう" },
  ko: { title: "축하합니다!", woman: "{c}의 창립 여성 크리에이터 #{n}입니다.", man: "{c}의 창립 남성 크리에이터 #{n}입니다.", body: "{d}까지 {s}, 이후 90/10이 적용됩니다.", button: "시작하기" },
  "zh-cn": { title: "恭喜！", woman: "你是{c}第 {n} 位创始女性创作者。", man: "你是{c}第 {n} 位创始男性创作者。", body: "{d}前你将保持 {s}，之后为 90/10。", button: "开始吧" },
  "zh-tw": { title: "恭喜！", woman: "你是{c}第 {n} 位創始女性創作者。", man: "你是{c}第 {n} 位創始男性創作者。", body: "{d}前你將保持 {s}，之後為 90/10。", button: "開始吧" },
};
export function foundingCongratsCopy(lang: string): Copy {
  const l = lang.toLowerCase();
  return FOUNDING_CONGRATS[l] ?? FOUNDING_CONGRATS[l === "zh" ? "zh-cn" : l.split("-")[0]] ?? FOUNDING_CONGRATS.en;
}
export const fillCopy = (t: string, v: Record<string, string | number>) => t.replace(/\{(\w)\}/g, (_, k) => String(v[k] ?? ""));
