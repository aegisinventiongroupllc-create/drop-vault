// Saved public-entry wording: no account session or translation service is needed.
const entryPhrases: Record<string, [string, string, string]> = {
  es: ["$20 / AÑO", "El pase de acceso dura 365 días. Los Bit-Tokens para acceder a las bibliotecas de los creadores se compran por separado.", "OBTENER MI PASE — $20"],
  pt: ["$20 / ANO", "O passe de entrada dura 365 dias. Os Bit-Tokens para acessar as bibliotecas dos criadores são comprados separadamente.", "OBTER MEU PASSE — $20"],
  fr: ["20 $ / AN", "Le pass d’entrée dure 365 jours. Les Bit-Tokens pour accéder aux bibliothèques des créateurs s’achètent séparément.", "OBTENIR MON PASS — 20 $"],
  de: ["20 $ / JAHR", "Der Zugangspass gilt 365 Tage. Bit-Tokens für den Zugriff auf Creator-Bibliotheken werden separat gekauft.", "ZUGANGSPASS KAUFEN — 20 $"],
  it: ["20 $ / ANNO", "Il pass d’ingresso dura 365 giorni. I Bit-Token per accedere alle librerie dei creator si acquistano separatamente.", "ACQUISTA IL PASS — 20 $"],
  nl: ["$20 / JAAR", "De toegangspas is 365 dagen geldig. Bit-Tokens voor toegang tot creatorbibliotheken worden apart gekocht.", "KOOP MIJN TOEGANGSPAS — $20"],
  pl: ["20 USD / ROK", "Karnet wstępu jest ważny przez 365 dni. Bit-Tokeny zapewniające dostęp do bibliotek twórców kupuje się osobno.", "KUP KARNET — 20 USD"],
  ru: ["20 $ / ГОД", "Входной пропуск действует 365 дней. Bit-Token для доступа к библиотекам авторов приобретаются отдельно.", "КУПИТЬ ПРОПУСК — 20 $"],
  uk: ["20 $ / РІК", "Вхідний абонемент діє 365 днів. Bit-Token для доступу до бібліотек авторів купуються окремо.", "ПРИДБАТИ АБОНЕМЕНТ — 20 $"],
  tr: ["20 $ / YIL", "Giriş kartı 365 gün geçerlidir. İçerik üreticilerinin arşivlerine erişim sağlayan Bit-Token’lar ayrıca satın alınır.", "GİRİŞ KARTIMI AL — 20 $"],
  ar: ["20 دولارًا / سنة", "تصريح الدخول صالح لمدة 365 يومًا. تُشترى رموز Bit-Token للوصول إلى مكتبات منشئي المحتوى بشكل منفصل.", "شراء تصريح الدخول — 20 دولارًا"],
  he: ["20 דולר / שנה", "כרטיס הכניסה תקף ל־365 ימים. אסימוני Bit-Token לגישה לספריות היוצרים נרכשים בנפרד.", "רכישת כרטיס כניסה — 20 דולר"],
  hi: ["$20 / वर्ष", "प्रवेश पास 365 दिनों तक मान्य है। क्रिएटर की लाइब्रेरी तक पहुँचने के लिए Bit-Token अलग से खरीदे जाते हैं।", "प्रवेश पास खरीदें — $20"],
  ja: ["20米ドル / 年", "入場パスは365日間有効です。クリエイターのライブラリーにアクセスするためのBit-Tokenは別途購入が必要です。", "入場パスを購入 — 20米ドル"],
  ko: ["20달러 / 년", "입장 패스는 365일간 유효합니다. 크리에이터 라이브러리 이용에 필요한 Bit-Token은 별도로 구매해야 합니다.", "입장 패스 구매 — 20달러"],
  "zh-cn": ["20美元 / 年", "入场通行证有效期为365天。访问创作者内容库所需的Bit-Token须另行购买。", "购买入场通行证 — 20美元"],
  "zh-tw": ["20美元 / 年", "入場通行證有效期為365天。存取創作者內容庫所需的Bit-Token須另行購買。", "購買入場通行證 — 20美元"],
  th: ["20 ดอลลาร์ / ปี", "บัตรผ่านเข้าใช้งานมีอายุ 365 วัน ต้องซื้อ Bit-Token สำหรับเข้าถึงคลังของครีเอเตอร์แยกต่างหาก", "ซื้อบัตรผ่าน — 20 ดอลลาร์"],
  vi: ["20 USD / NĂM", "Vé truy cập có hiệu lực 365 ngày. Bit-Token để truy cập thư viện của nhà sáng tạo được mua riêng.", "MUA VÉ TRUY CẬP — 20 USD"],
  id: ["US$20 / TAHUN", "Pass masuk berlaku selama 365 hari. Bit-Token untuk mengakses perpustakaan kreator dibeli secara terpisah.", "BELI PASS MASUK — US$20"],
  ms: ["AS$20 / TAHUN", "Pas masuk sah selama 365 hari. Bit-Token untuk mengakses perpustakaan pencipta dibeli secara berasingan.", "BELI PAS MASUK — AS$20"],
  tl: ["$20 / TAON", "May bisa ang entry pass sa loob ng 365 araw. Hiwalay na binibili ang Bit-Token para ma-access ang mga library ng creator.", "BILHIN ANG ENTRY PASS — $20"],
  sv: ["20 USD / ÅR", "Inträdespasset gäller i 365 dagar. Bit-Token för tillgång till kreatörernas bibliotek köps separat.", "KÖP MITT INTRÄDESPASS — 20 USD"],
  no: ["20 USD / ÅR", "Adgangspasset er gyldig i 365 dager. Bit-Token for tilgang til skapernes biblioteker kjøpes separat.", "KJØP ADGANGSPASS — 20 USD"],
  da: ["20 USD / ÅR", "Adgangspasset gælder i 365 dage. Bit-Token til adgang til skabernes biblioteker købes separat.", "KØB ADGANGSPAS — 20 USD"],
  fi: ["20 USD / VUOSI", "Pääsylippu on voimassa 365 päivää. Sisällöntuottajien kirjastoihin tarvittavat Bit-Tokenit ostetaan erikseen.", "OSTA PÄÄSYLIPPU — 20 USD"],
  el: ["20 USD / ΕΤΟΣ", "Το πάσο εισόδου ισχύει για 365 ημέρες. Τα Bit-Token για πρόσβαση στις βιβλιοθήκες δημιουργών αγοράζονται ξεχωριστά.", "ΑΓΟΡΑ ΠΑΣΟΥ — 20 USD"],
  cs: ["20 USD / ROK", "Vstupní průkaz platí 365 dní. Bit-Tokeny pro přístup do knihoven tvůrců se kupují samostatně.", "KOUPIT VSTUPNÍ PRŮKAZ — 20 USD"],
  ro: ["20 USD / AN", "Permisul de acces este valabil 365 de zile. Bit-Token pentru accesul la bibliotecile creatorilor se cumpără separat.", "CUMPĂRĂ PERMISUL — 20 USD"],
  hu: ["20 USD / ÉV", "A belépő 365 napig érvényes. Az alkotók könyvtáraihoz szükséges Bit-Tokenek külön vásárolhatók meg.", "BELÉPŐ VÁSÁRLÁSA — 20 USD"],
  bg: ["20 USD / ГОДИНА", "Входният пропуск е валиден 365 дни. Bit-Token за достъп до библиотеките на създателите се купуват отделно.", "КУПИ ПРОПУСК — 20 USD"],
  sr: ["20 USD / ГОДИНА", "Улазна пропусница важи 365 дана. Bit-Token за приступ библиотекама креатора купују се засебно.", "КУПИ ПРОПУСНИЦУ — 20 USD"],
  hr: ["20 USD / GODINA", "Ulazna propusnica vrijedi 365 dana. Bit-Token za pristup bibliotekama kreatora kupuju se zasebno.", "KUPI PROPUSNICU — 20 USD"],
  sw: ["DOLA 20 / MWAKA", "Pasi ya kuingia ni halali kwa siku 365. Bit-Token za kufikia maktaba za watayarishi hununuliwa kando.", "NUNUA PASI YANGU — DOLA 20"],
  af: ["20 USD / JAAR", "Die toegangspas is 365 dae geldig. Bit-Token vir toegang tot skeppers se biblioteke word afsonderlik gekoop.", "KOOP MY TOEGANGSPAS — 20 USD"],
};

export const ENTRY_SUMMARY = "Entry pass lasts 365 days. Creator vault access requires separately purchased Bit-Tokens.";
export function savedEntryTranslations(lang: string): Record<string, string> {
  const phrases = entryPhrases[lang.toLowerCase()] || entryPhrases[lang.split("-")[0]];
  if (!phrases) return {};
  return { "$20 / YEAR": phrases[0], [ENTRY_SUMMARY]: phrases[1], "GET MY ENTRY PASS — $20": phrases[2] };
}