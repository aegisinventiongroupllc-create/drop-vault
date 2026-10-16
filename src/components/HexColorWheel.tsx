import { useEffect, useRef } from "react";
import iro from "@jaames/iro";

/** Circular color wheel (same picker as the DTT letters) for any hex value. */
export default function HexColorWheel({ color, onChange, label }: { color: string; onChange: (hex: string) => void; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const picker = useRef<ReturnType<typeof iro.ColorPicker>>();
  const cb = useRef(onChange);
  cb.current = onChange;
  useEffect(() => {
    if (!box.current) return;
    const p = iro.ColorPicker(box.current, {
      width: 180, color, borderWidth: 0,
      layout: [{ component: iro.ui.Wheel }, { component: iro.ui.Slider, options: { sliderType: "value" } }],
    });
    picker.current = p;
    const up = (c: { hexString: string }) => cb.current(c.hexString);
    p.on("input:change", up);
    const el = box.current;
    return () => { p.off("input:change", up); el.replaceChildren(); picker.current = undefined; };
  }, []);
  useEffect(() => { if (picker.current && picker.current.color.hexString !== color) picker.current.color.hexString = color; }, [color]);
  return <div ref={box} role="group" aria-label={label} className="mx-auto max-w-full touch-none" />;
}
