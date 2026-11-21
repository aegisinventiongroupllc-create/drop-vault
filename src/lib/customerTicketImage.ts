import galaxy from "@/assets/dtt-original-pink-starfield.jpg.asset.json";
import globeUrl from "@/assets/dtt-pink-globe-icon-clean.png";
import type { CustomerWaitlistTicket } from "./customerWaitlistTicket";

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Ticket artwork could not be loaded"));
    image.src = url;
  });
}

/** Render locally: account details never go to an image-generation service. */
export async function createCustomerTicketImage(ticket: CustomerWaitlistTicket, countryName: string): Promise<Blob> {
  const [sky, globe] = await Promise.all([loadImage(galaxy.url), loadImage(globeUrl), document.fonts.ready]);
  const css = getComputedStyle(document.documentElement);
  const color = (name: string, alpha = 1) => `hsl(${css.getPropertyValue(name).trim()} / ${alpha})`;
  const canvas = document.createElement("canvas");
  canvas.width = 1080; canvas.height = 1560;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Ticket image unavailable");
  const body = css.getPropertyValue("--font-body").trim();
  const display = css.getPropertyValue("--font-display").trim();
  const text = (value: string, x: number, y: number, size: number, ink = "--foreground", weight = 400, family = body) => {
    ctx.font = `${weight} ${size}px ${family}`;
    ctx.fillStyle = color(ink);
    ctx.fillText(value, x, y);
  };
  const wrap = (value: string, y: number, size = 27, ink = "--muted-foreground") => {
    ctx.font = `400 ${size}px ${body}`;
    let line = "";
    for (const word of value.split(" ")) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > 900) {
        text(line, 90, y, size, ink); y += size * 1.5; line = word;
      } else line = next;
    }
    if (line) { text(line, 90, y, size, ink); y += size * 1.5; }
    return y;
  };
  ctx.fillStyle = color("--background"); ctx.fillRect(0, 0, 1080, 1560);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 1080, 480); ctx.clip();
  // The shared sky image contains a globe. Use only its globe-free left
  // starfield, alternating mirrored strips so the ticket has one globe.
  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.translate(i * 360 + (i % 2 ? 360 : 0), 0);
    if (i % 2) ctx.scale(-1, 1);
    ctx.drawImage(sky, 0, 0, sky.width * .24, sky.height, 0, 0, 360, 480);
    ctx.restore();
  }
  ctx.fillStyle = color("--background", .35); ctx.fillRect(0, 0, 1080, 480);
  ctx.restore();
  ctx.drawImage(globe, 535, 10, 460, 460);
  text("DTT™", 90, 170, 86, "--foreground", 700, display);
  text("DROP THAT THING™", 90, 240, 30, "--foreground", 600);
  text("FOUNDING CUSTOMER", 90, 386, 29, "--foreground", 600);
  text("Your front-row start.", 90, 440, 30);
  ctx.fillStyle = color("--consent-pink"); ctx.fillRect(50, 490, 980, 3);
  text("YOUR SAVED ANNUAL ENTRY", 90, 573, 26, "--consent-pink", 600);
  text("$10", 85, 705, 120, "--foreground", 700);
  text("/ year for life", 360, 700, 42, "--consent-pink", 600);
  text("You believed in DTT from the beginning.", 90, 773, 29);
  let y = wrap("Your $10 rate is saved to this account, including annual renewals. Standard annual entry is $20.", 837, 28, "--foreground");
  y = wrap("365 days per paid pass · Global twerking feed when viewing opens. Creator libraries use separate Bit-Tokens.", y + 14);
  const divider = y + 26;
  ctx.strokeStyle = color("--consent-pink", .6); ctx.lineWidth = 2; ctx.setLineDash([9, 12]);
  ctx.beginPath(); ctx.moveTo(50, divider); ctx.lineTo(1030, divider); ctx.stroke(); ctx.setLineDash([]);
  text("MEMBERSHIP RECEIPT", 90, divider + 65, 24, "--consent-pink", 600);
  text(ticket.number, 90, divider + 112, 25, "--foreground", 500, "monospace");
  y = wrap(`Joined ${new Date(ticket.joinedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })} (UTC) · ${countryName}`, divider + 162, 26, "--foreground");
  y = wrap("Free waiting-list membership. Not an invoice, payment or access pass. Non-transferable; no payment is due today.", y + 18, 25);
  wrap("Payments are being prepared for launch. Keep this receipt for your records; your offer stays saved in DTT.", y + 10, 25);
  text("dropthatthing.com", 90, 1456, 32, "--consent-pink", 600);
  text("Support: dropthatthingmedia@gmail.com", 90, 1505, 23);
  ctx.strokeStyle = color("--consent-pink", .7); ctx.lineWidth = 2; ctx.strokeRect(24, 24, 1032, 1512);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Ticket image unavailable")), "image/png"));
}

export async function saveCustomerTicketImage(blob: Blob): Promise<void> {
  const file = new File([blob], "DTT-founding-customer-ticket.png", { type: "image/png" });
  if (matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: "My DTT founding customer ticket" }); return; }
    catch (error) { if (error instanceof DOMException && error.name === "AbortError") return; }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = file.name;
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}