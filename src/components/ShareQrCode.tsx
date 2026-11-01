import { useLayoutEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ShareQrCode({ value, filename, label }: { value: string; filename: string; label: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const count = svg.viewBox.baseVal.width;
    const namespace = "http://www.w3.org/2000/svg";
    const ink = getComputedStyle(svg).getPropertyValue("--qr-ink").trim();
    const paper = getComputedStyle(svg).getPropertyValue("--qr-surface").trim();
    svg.querySelectorAll("[data-dtt-brand]").forEach((node) => node.remove());
    // Finder patterns must remain untouched; H correction protects a small central mark.
    const group = document.createElementNS(namespace, "g");
    group.setAttribute("data-dtt-brand", "");
    group.setAttribute("aria-hidden", "true");
    const panel = document.createElementNS(namespace, "rect");
    panel.setAttribute("x", String(count / 2 - 4));
    panel.setAttribute("y", String(count / 2 - 2));
    panel.setAttribute("width", "8");
    panel.setAttribute("height", "4");
    panel.setAttribute("rx", "0.4");
    panel.setAttribute("fill", `hsl(${paper})`);
    group.appendChild(panel);
    const corners = [
      { x: count / 2 - 2.3, y: count / 2, letter: "D" },
      { x: count / 2, y: count / 2, letter: "T" },
      { x: count / 2 + 2.2, y: count / 2, letter: "T" },
    ];
    for (const { x, y, letter } of corners) {
      const text = document.createElementNS(namespace, "text");
      text.setAttribute("x", String(x));
      text.setAttribute("y", String(y + 0.08));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "central");
      text.setAttribute("font-family", "Arial, sans-serif");
      text.setAttribute("font-weight", "900");
      text.setAttribute("font-size", "3");
      text.setAttribute("fill", `hsl(${letter === "T" && x > count / 2 ? getComputedStyle(svg).getPropertyValue("--dtt-pink").trim() : ink})`);
      text.textContent = letter;
      group.appendChild(text);
    }
    // Resolve semantic tokens into the SVG so downloaded files are self-contained.
    const paths = svg.querySelectorAll(":scope > path");
    paths[0]?.setAttribute("fill", `hsl(${paper})`);
    paths[1]?.setAttribute("fill", `hsl(${ink})`);
    svg.appendChild(group);
  }, [value]);
  const download = async () => {
    let objectUrl: string | undefined;
    try {
      const svg = svgRef.current;
      if (!svg) throw new Error("QR not ready");
      const copy = svg.cloneNode(true) as SVGSVGElement;
      copy.setAttribute("width", "1024");
      copy.setAttribute("height", "1024");
      objectUrl = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)], { type: "image/svg+xml" }));
      const image = new Image();
      image.src = objectUrl;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 1024;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("QR export unavailable");
      context.drawImage(image, 0, 0, 1024, 1024);
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast.error("Download failed. Please try again.");
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
  };
  return (
    <div className="space-y-4 text-center">
      <div className="dtt-qr-frame mx-auto w-fit rounded-lg p-2" role="img" aria-label={label}>
        <QRCodeSVG ref={svgRef} value={value} size={256} level="H" marginSize={4} bgColor="hsl(var(--qr-surface))" fgColor="hsl(var(--qr-ink))" />
      </div>
      <p className="text-xs text-muted-foreground break-all">{value.replace(/^https:\/\//, "")}</p>
      <Button variant="neon" size="sm" onClick={download}>DOWNLOAD QR CODE</Button>
    </div>
  );
}