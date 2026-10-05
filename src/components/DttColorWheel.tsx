import { useEffect, useRef } from "react";
import iro from "@jaames/iro";
import { Input } from "@/components/ui/input";
import { dttColorHex, isDttColor, type DttColor } from "@/lib/dttIcon";

export default function DttColorWheel({ color, onChange, letter }: { color: DttColor; onChange: (color: DttColor) => void; letter: string }) {
  const container = useRef<HTMLDivElement>(null);
  const picker = useRef<ReturnType<typeof iro.ColorPicker>>();
  const callback = useRef(onChange);
  callback.current = onChange;
  useEffect(() => {
    if (!container.current) return;
    const instance = iro.ColorPicker(container.current, {
      width: 220, color: dttColorHex(color), borderWidth: 0,
      layout: [{ component: iro.ui.Wheel }, { component: iro.ui.Slider, options: { sliderType: "value" } }],
    });
    picker.current = instance;
    const update = (selected: { hexString: string }) => callback.current(selected.hexString as DttColor);
    instance.on("input:change", update);
    return () => { instance.off("input:change", update); container.current?.replaceChildren(); picker.current = undefined; };
  }, []);
  useEffect(() => { if (picker.current) picker.current.color.hexString = dttColorHex(color); }, [color]);
  return <div className="flex flex-col items-center gap-3">
    <div ref={container} role="group" aria-label={`Color wheel for ${letter}`} className="max-w-full touch-none" />
    <div className="flex w-full max-w-[220px] items-center gap-3">
      <label htmlFor="dtt-custom-color" className="text-xs text-muted-foreground">Color</label>
      <Input id="dtt-custom-color" aria-label={`Custom color for ${letter}`} key={letter + color} defaultValue={dttColorHex(color)} maxLength={7} className="font-mono uppercase" onChange={(event) => { if (isDttColor(event.target.value)) onChange(event.target.value); }} />
    </div>
  </div>;
}