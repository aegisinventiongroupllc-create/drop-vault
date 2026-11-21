import { toBlob } from "html-to-image";

/** Local still export: never claims to install a native widget or update off-app. */
export async function createLockScreenImage(element: HTMLElement): Promise<Blob> {
  await document.fonts.ready;
  if (!element.querySelector("canvas")) throw new Error("The globe is still loading. Please retry.");
  const blob = await toBlob(element, { pixelRatio: 1440 / element.clientWidth, cacheBust: false, skipFonts: true });
  if (!blob) throw new Error("Wallpaper could not be created. Please retry.");
  return blob;
}

export async function saveLockScreenImage(blob: Blob): Promise<void> {
  const video = blob.type === "video/mp4";
  const file = new File([blob], `DTT-galaxy-lock-screen.${video ? "mp4" : "png"}`, { type: blob.type });
  if (matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: "DTT lock screen" }); return; }
    catch (error) { if (error instanceof DOMException && error.name === "AbortError") return; }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = file.name;
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}