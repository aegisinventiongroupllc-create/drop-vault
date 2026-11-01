import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ShareQrCode({ value, filename, label }: { value: string; filename: string; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const download = () => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("QR not ready");
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast.error("Download failed. Please try again.");
    }
  };
  return (
    <div className="space-y-4 text-center">
      <div className="dtt-qr-frame mx-auto w-fit rounded-lg p-2" role="img" aria-label={label}>
        <QRCodeCanvas ref={canvasRef} value={value} size={192} level="H" marginSize={4} />
      </div>
      <p className="text-xs text-muted-foreground break-all">{value.replace(/^https:\/\//, "")}</p>
      <Button variant="neon" size="sm" onClick={download}>DOWNLOAD QR CODE</Button>
    </div>
  );
}