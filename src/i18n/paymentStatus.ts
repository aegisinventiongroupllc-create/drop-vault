// Saved payment safety notices: no remote translation request is needed.
const pending = "Checkout is unavailable. Payment approval and verification are pending. No payment will be taken.";
const unavailable = "CHECKOUT UNAVAILABLE";
const notices: Record<string, [string, string]> = {
  en: [pending, unavailable],
  es: ["El pago no está disponible. La aprobación y verificación están pendientes. No se cobrará ningún pago.", "PAGO NO DISPONIBLE"],
  pt: ["O pagamento está indisponível. A aprovação e a verificação estão pendentes. Nenhum pagamento será cobrado.", "PAGAMENTO INDISPONÍVEL"],
  fr: ["Le paiement est indisponible. L’approbation et la vérification sont en attente. Aucun paiement ne sera prélevé.", "PAIEMENT INDISPONIBLE"],
  de: ["Die Zahlung ist nicht verfügbar. Genehmigung und Prüfung stehen noch aus. Es wird keine Zahlung eingezogen.", "ZAHLUNG NICHT VERFÜGBAR"],
  it: ["Il pagamento non è disponibile. Approvazione e verifica sono in sospeso. Non verrà addebitato alcun pagamento.", "PAGAMENTO NON DISPONIBILE"],
  nl: ["Betalen is niet beschikbaar. Goedkeuring en verificatie zijn nog in behandeling. Er wordt geen betaling afgeschreven.", "BETALEN NIET BESCHIKBAAR"],
  pl: ["Płatność jest niedostępna. Zatwierdzenie i weryfikacja oczekują na zakończenie. Żadna płatność nie zostanie pobrana.", "PŁATNOŚĆ NIEDOSTĘPNA"],
  ru: ["Оплата недоступна. Одобрение и проверка ещё не завершены. Платёж не будет списан.", "ОПЛАТА НЕДОСТУПНА"],
  uk: ["Оплата недоступна. Схвалення та перевірку ще не завершено. Платіж не буде стягнуто.", "ОПЛАТА НЕДОСТУПНА"],
  tr: ["Ödeme kullanılamıyor. Onay ve doğrulama bekleniyor. Herhangi bir ödeme alınmayacak.", "ÖDEME KULLANILAMIYOR"],
  ar: ["الدفع غير متاح. الموافقة والتحقق قيد الانتظار. لن يتم تحصيل أي دفعة.", "الدفع غير متاح"],
  he: ["התשלום אינו זמין. האישור והאימות עדיין ממתינים. לא ייגבה כל תשלום.", "התשלום אינו זמין"],
  hi: ["भुगतान उपलब्ध नहीं है। स्वीकृति और सत्यापन लंबित हैं। कोई भुगतान नहीं लिया जाएगा।", "भुगतान उपलब्ध नहीं है"],
  ja: ["決済は利用できません。承認と確認が完了していません。お支払いは発生しません。", "決済は利用できません"],
  ko: ["결제를 이용할 수 없습니다. 승인 및 검증이 대기 중입니다. 결제 금액은 청구되지 않습니다.", "결제 이용 불가"],
  "zh-cn": ["暂时无法付款。审批和验证尚未完成。不会收取任何款项。", "暂时无法付款"],
  "zh-tw": ["暫時無法付款。審批與驗證尚未完成。不會收取任何款項。", "暫時無法付款"],
  th: ["ไม่สามารถชำระเงินได้ การอนุมัติและการตรวจสอบยังอยู่ระหว่างดำเนินการ จะไม่มีการเรียกเก็บเงิน", "ไม่สามารถชำระเงินได้"],
  vi: ["Thanh toán chưa khả dụng. Đang chờ phê duyệt và xác minh. Sẽ không thu bất kỳ khoản thanh toán nào.", "CHƯA THỂ THANH TOÁN"],
  id: ["Pembayaran tidak tersedia. Persetujuan dan verifikasi masih tertunda. Tidak ada pembayaran yang akan ditagih.", "PEMBAYARAN TIDAK TERSEDIA"],
  ms: ["Pembayaran tidak tersedia. Kelulusan dan pengesahan masih belum selesai. Tiada bayaran akan dikenakan.", "PEMBAYARAN TIDAK TERSEDIA"],
  tl: ["Hindi available ang pagbabayad. Nakabinbin ang pag-apruba at pag-verify. Walang sisingiling bayad.", "HINDI AVAILABLE ANG PAGBABAYAD"],
  sv: ["Betalning är inte tillgänglig. Godkännande och verifiering väntar. Ingen betalning kommer att dras.", "BETALNING EJ TILLGÄNGLIG"],
  no: ["Betaling er ikke tilgjengelig. Godkjenning og verifisering gjenstår. Ingen betaling vil bli trukket.", "BETALING IKKE TILGJENGELIG"],
  da: ["Betaling er ikke tilgængelig. Godkendelse og verificering afventer. Ingen betaling vil blive trukket.", "BETALING IKKE TILGÆNGELIG"],
  fi: ["Maksaminen ei ole käytettävissä. Hyväksyntä ja vahvistus ovat kesken. Maksua ei veloiteta.", "MAKSAMINEN EI OLE KÄYTETTÄVISSÄ"],
  el: ["Η πληρωμή δεν είναι διαθέσιμη. Εκκρεμούν η έγκριση και η επαλήθευση. Δεν θα χρεωθεί καμία πληρωμή.", "Η ΠΛΗΡΩΜΗ ΔΕΝ ΕΙΝΑΙ ΔΙΑΘΕΣΙΜΗ"],
  cs: ["Platba není dostupná. Schválení a ověření dosud nebyly dokončeny. Žádná platba nebude účtována.", "PLATBA NENÍ DOSTUPNÁ"],
  ro: ["Plata nu este disponibilă. Aprobarea și verificarea sunt în așteptare. Nu se va încasa nicio plată.", "PLATĂ INDISPONIBILĂ"],
  hu: ["A fizetés nem érhető el. A jóváhagyás és az ellenőrzés függőben van. Nem terhelünk meg semmilyen fizetést.", "FIZETÉS NEM ELÉRHETŐ"],
  bg: ["Плащането не е достъпно. Одобрението и проверката все още се очакват. Няма да бъде начислено плащане.", "ПЛАЩАНЕТО НЕ Е ДОСТЪПНО"],
  sr: ["Плаћање није доступно. Одобрење и провера су на чекању. Никаква уплата неће бити наплаћена.", "ПЛАЋАЊЕ НИЈЕ ДОСТУПНО"],
  hr: ["Plaćanje nije dostupno. Odobrenje i provjera još su na čekanju. Nikakva uplata neće biti naplaćena.", "PLAĆANJE NIJE DOSTUPNO"],
  sw: ["Malipo hayapatikani. Idhini na uthibitishaji bado vinasubiriwa. Hakuna malipo yatakayotozwa.", "MALIPO HAYAPATIKANI"],
  af: ["Betaling is nie beskikbaar nie. Goedkeuring en verifikasie is nog hangende. Geen betaling sal gehef word nie.", "BETALING NIE BESKIKBAAR NIE"],
};

export function paymentStatusTranslations(lang: string): Record<string, string> {
  const normalized = lang.toLowerCase();
  const entry = notices[normalized] ?? notices[normalized.split("-")[0]];
  return entry ? { [pending]: entry[0], [unavailable]: entry[1] } : {};
}