import coin from "@/assets/dtt-reward-coin.png";
import { useState } from "react";
export type TeaserFrame = "none" | "seasonal" | "sexy" | "gothic" | "glamour";
export default function TeaserViewport({ url, type, frame = "none", children }: { url: string; type: "photo" | "video"; frame?: TeaserFrame; children?: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  return <div className={`teaser-viewport teaser-frame-${frame} relative w-full aspect-[9/16] overflow-hidden bg-background rounded-lg`}>
    {type === "photo" ? <img src={url} alt="Teaser" onError={() => setFailed(true)} className="w-full h-full object-contain" /> : <video src={url} controls autoPlay playsInline preload="metadata" onError={() => setFailed(true)} className="w-full h-full object-contain" />}
    {failed && <div role="alert" className="absolute inset-0 flex items-center justify-center bg-background/95 p-6 text-center text-sm text-muted-foreground">This file couldn't be played. Try another browser or upload an MP4 copy.</div>}
    <img src={coin} alt="" aria-hidden="true" className="absolute top-4 left-1/2 -translate-x-1/2 h-10 w-10 object-contain opacity-20 pointer-events-none" />
    <div aria-hidden="true" className="teaser-decoration absolute inset-0 pointer-events-none" />
    {children}
  </div>;
}