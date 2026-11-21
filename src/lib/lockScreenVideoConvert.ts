import coreURL from "@ffmpeg/core?url";
import wasmURL from "@ffmpeg/core/wasm?url";
import classWorkerURL from "@ffmpeg/ffmpeg/worker?worker&url";
import { FFmpeg } from "@ffmpeg/ffmpeg";

export async function convertWallpaperToMp4(input: Blob, signal: AbortSignal, progress: (percent: number) => void): Promise<Blob> {
  const encoder = new FFmpeg();
  const abort = () => encoder.terminate();
  signal.addEventListener("abort", abort, { once: true });
  try {
    if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
    progress(76);
    await encoder.load({ coreURL, wasmURL, classWorkerURL });
    encoder.on("progress", event => progress(Math.min(99, 76 + Math.round(event.progress * 23))));
    await encoder.writeFile("wallpaper.webm", new Uint8Array(await input.arrayBuffer()));
    const result = await encoder.exec(["-i", "wallpaper.webm", "-t", "10", "-an", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23", "-pix_fmt", "yuv420p", "-threads", "1", "-movflags", "+faststart", "wallpaper.mp4"], 120_000);
    if (result !== 0) throw new Error("MP4 preparation failed. Try the still image.");
    const output = await encoder.readFile("wallpaper.mp4");
    if (!(output instanceof Uint8Array) || !output.length) throw new Error("MP4 preparation failed. Please retry.");
    progress(100);
    return new Blob([new Uint8Array(output)], { type: "video/mp4" });
  } finally { signal.removeEventListener("abort", abort); encoder.terminate(); }
}