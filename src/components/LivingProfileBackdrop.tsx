import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PROFILE_BACKDROPS } from "@/lib/profileBackdrops";

/** Motion is confined to the backdrop, never the portrait or uploaded photos. */
export default function LivingProfileBackdrop({ image, alt = "" }: { image?: string; alt?: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const design = PROFILE_BACKDROPS.find(item => item.image === image)?.id;
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const observer = new IntersectionObserver(entries => setVisible(entries.some(entry => entry.isIntersecting)));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <div ref={container} className="living-backdrop absolute inset-0 overflow-hidden" data-design={design} data-running={visible && !paused}>
    <img src={image} alt={alt} className="living-backdrop-photo h-full w-full object-cover" />
    {design && <>
      <div className="living-backdrop-light absolute inset-0 pointer-events-none" aria-hidden="true" />
      <div className="living-backdrop-particles absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {Array.from({ length: 10 }, (_, index) => <i key={index} className={`living-particle living-particle-${index}`} />)}
      </div>
      <Button variant="secondary" size="icon" className="living-backdrop-control absolute bottom-2 right-2 z-10 h-7 w-7 bg-background/70 text-foreground" aria-label={paused ? "Play backdrop motion" : "Pause backdrop motion"} title={paused ? "Play backdrop motion" : "Pause backdrop motion"} onClick={() => setPaused(value => !value)}>
        {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
      </Button>
    </>}
  </div>;
}