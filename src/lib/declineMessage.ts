import { getAutoLang } from "@/lib/siteTranslate";

/** Saved default decline messages ({n} = Bit-Tokens). No AI calls. */
const TEMPLATES: Record<string, [string, string]> = {
  en: ["Thank you! My starting offers begin higher than this. Feel free to send a new request.", "Thank you! My starting offers begin at {n} Bit-Tokens. Feel free to send a new request."],
  es: ["¡Gracias! Mis ofertas iniciales empiezan más alto. No dudes en enviar una nueva solicitud.", "¡Gracias! Mis ofertas iniciales empiezan en {n} Bit-Tokens. No dudes en enviar una nueva solicitud."],
  pt: ["Obrigado! Minhas ofertas iniciais começam mais alto. Fique à vontade para enviar um novo pedido.", "Obrigado! Minhas ofertas iniciais começam em {n} Bit-Tokens. Fique à vontade para enviar um novo pedido."],
  fr: ["Merci ! Mes offres de départ sont plus élevées. N'hésitez pas à envoyer une nouvelle demande.", "Merci ! Mes offres de départ commencent à {n} Bit-Tokens. N'hésitez pas à envoyer une nouvelle demande."],
  de: ["Danke! Meine Startangebote beginnen höher. Sende gern eine neue Anfrage.", "Danke! Meine Startangebote beginnen bei {n} Bit-Tokens. Sende gern eine neue Anfrage."],
  it: ["Grazie! Le mie offerte iniziali partono più in alto. Sentiti libero di inviare una nuova richiesta.", "Grazie! Le mie offerte iniziali partono da {n} Bit-Tokens. Sentiti libero di inviare una nuova richiesta."],
  ru: ["Спасибо! Мои стартовые предложения выше. Можете отправить новый запрос.", "Спасибо! Мои стартовые предложения — от {n} Bit-Tokens. Можете отправить новый запрос."],
  ar: ["شكرًا لك! عروضي الأولية تبدأ بسعر أعلى. يمكنك إرسال طلب جديد.", "شكرًا لك! عروضي الأولية تبدأ من {n} Bit-Tokens. يمكنك إرسال طلب جديد."],
  hi: ["धन्यवाद! मेरे शुरुआती ऑफ़र इससे ज़्यादा से शुरू होते हैं। बेझिझक नया अनुरोध भेजें।", "धन्यवाद! मेरे शुरुआती ऑफ़र {n} Bit-Tokens से शुरू होते हैं। बेझिझक नया अनुरोध भेजें।"],
  zh: ["谢谢！我的起始报价更高。欢迎发送新的请求。", "谢谢！我的起始报价为 {n} Bit-Tokens 起。欢迎发送新的请求。"],
  ko: ["감사합니다! 제 시작 제안가는 이보다 높습니다. 새 요청을 보내 주세요.", "감사합니다! 제 시작 제안가는 {n} Bit-Tokens부터입니다. 새 요청을 보내 주세요."],
  tr: ["Teşekkürler! Başlangıç tekliflerim daha yüksektir. Yeni bir istek gönderebilirsiniz.", "Teşekkürler! Başlangıç tekliflerim {n} Bit-Tokens'tan başlar. Yeni bir istek gönderebilirsiniz."],
  nl: ["Bedankt! Mijn startbiedingen beginnen hoger. Stuur gerust een nieuw verzoek.", "Bedankt! Mijn startbiedingen beginnen bij {n} Bit-Tokens. Stuur gerust een nieuw verzoek."],
  pl: ["Dziękuję! Moje oferty początkowe zaczynają się wyżej. Śmiało wyślij nową prośbę.", "Dziękuję! Moje oferty początkowe zaczynają się od {n} Bit-Tokens. Śmiało wyślij nową prośbę."],
  id: ["Terima kasih! Penawaran awal saya lebih tinggi. Silakan kirim permintaan baru.", "Terima kasih! Penawaran awal saya mulai dari {n} Bit-Tokens. Silakan kirim permintaan baru."],
  fil: ["Salamat! Mas mataas ang panimulang alok ko. Malaya kang magpadala ng bagong request.", "Salamat! Nagsisimula ang panimulang alok ko sa {n} Bit-Tokens. Malaya kang magpadala ng bagong request."],
};

export function currentLang() {
  return (getAutoLang() || localStorage.getItem("dtt_locale") || navigator.language || "en").toLowerCase();
}

export function defaultDeclineMessage(tokens: string, lang = currentLang()): string {
  const t = TEMPLATES[lang] ?? TEMPLATES[lang.split("-")[0]] ?? TEMPLATES.en;
  return Number(tokens) >= 1 ? t[1].replace("{n}", String(Number(tokens))) : t[0];
}

/** True when the text is still one of our untouched defaults (any language). */
export function isDefaultDeclineMessage(text: string): boolean {
  return Object.values(TEMPLATES).some(([a, b]) => text === a || new RegExp("^" + b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace("\\{n\\}", "\\d+") + "$").test(text));
}
