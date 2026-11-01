import ShareQrCode from "@/components/ShareQrCode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";

export default function DttShareQr() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs font-bold text-primary">SHARE DTT</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm rounded-lg">
        <DialogTitle className="text-center">DTT</DialogTitle>
        <DialogDescription className="text-center">DropThatThing · 18+</DialogDescription>
        <ShareQrCode value="https://dropthatthing.com" filename="dtt-qr.png" label="DTT website QR code" />
      </DialogContent>
    </Dialog>
  );
}