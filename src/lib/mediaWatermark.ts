import coreURL from "@ffmpeg/core?url";
import wasmURL from "@ffmpeg/core/wasm?url";
import classWorkerURL from "@ffmpeg/ffmpeg/worker?worker&url";

export type WatermarkProgress = (message: string, percent: number) => void;

function paintMark(context: CanvasRenderingContext2D, width: number, height: number) {
  const tokens = getComputedStyle(document.documentElement);
  const color = (name: string) => `hsl(${tokens.getPropertyValue(name).trim()})`;
  const size = Math.max(12, Math.round(Math.min(width, height) * 0.06));
  const margin = Math.max(6, Math.round(Math.min(width, height) * 0.035));
  context.font = `900 ${size}px Arial, sans-serif`;
  context.textBaseline = "bottom";
  context.lineJoin = "round";
  context.lineWidth = Math.max(2, size * 0.12);
  context.strokeStyle = color("--background");
  const letters = ["D", "T", "T"];
  const widths = letters.map((letter) => context.measureText(letter).width);
  let x = width - margin - widths.reduce((sum, value) => sum + value, 0);
  for (const [index, letter] of letters.entries()) {
    context.fillStyle = color(index === 2 ? "--dtt-pink" : "--foreground");
    context.strokeText(letter, x, height - margin);
    context.fillText(letter, x, height - margin);
    x += widths[index];
  }
}

async function canvasBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(new Error("Couldn't create the DTT watermark. Please try again."));
  }, type, 0.94));
}

async function imageWithMark(file: File, progress?: WatermarkProgress): Promise<File> {
  progress?.("Adding DTT to your photo…", 10);
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 4096 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser couldn't process this photo.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    paintMark(context, canvas.width, canvas.height);
    const blob = await canvasBlob(canvas, "image/jpeg");
    progress?.("DTT photo ready. Uploading…", 95);
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-dtt.jpg`, { type: blob.type });
  } finally {
    bitmap.close();
  }
}

async function videoSize(file: File): Promise<{ width: number; height: number }> {
  const video = document.createElement("video");
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Couldn't read this video. Try an MP4 file.")), 15000);
      video.onloadedmetadata = () => {
        clearTimeout(timer);
        if (!video.videoWidth || !video.videoHeight) reject(new Error("This video has no picture."));
        else resolve({ width: video.videoWidth, height: video.videoHeight });
      };
      video.onerror = () => { clearTimeout(timer); reject(new Error("Couldn't read this video. Try an MP4 file.")); };
      video.preload = "metadata";
      video.src = url;
    });
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

let processingVideo = false;

async function videoWithMark(file: File, progress?: WatermarkProgress): Promise<File> {
  if (processingVideo) throw new Error("Please wait for your other video to finish.");
  if (file.size > 512 * 1024 * 1024) throw new Error("This video is too large to watermark on this device. Please use a file under 512 MB.");
  processingVideo = true;
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const encoder = new FFmpeg();
  try {
    progress?.("Preparing DTT video watermark… Keep this page open.", 1);
    const { width, height } = await videoSize(file);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser couldn't process this video.");
    paintMark(context, width, height);
    const watermark = await canvasBlob(canvas, "image/png");
    await encoder.load({ coreURL, wasmURL, classWorkerURL });
    encoder.on("progress", ({ progress: fraction }) => {
      const percent = Math.min(94, Math.max(2, Math.round(fraction * 90)));
      progress?.(`Adding DTT to your video… ${percent}% — keep this page open.`, percent);
    });
    const extension = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "mp4";
    const input = `input.${extension}`;
    await encoder.writeFile(input, new Uint8Array(await file.arrayBuffer()));
    await encoder.writeFile("dtt.png", new Uint8Array(await watermark.arrayBuffer()));
    const code = await encoder.exec([
      "-i", input, "-i", "dtt.png", "-filter_complex_threads", "1",
      "-filter_complex", "[0:v:0][1:v:0]overlay=0:0:format=auto,scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p[v]",
      "-map", "[v]", "-map", "0:a?", "-c:v", "libx264", "-preset", "ultrafast",
      "-crf", "23", "-threads", "1", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "output.mp4",
    ]);
    if (code !== 0) throw new Error("Couldn't add DTT to this video. Try a smaller MP4 file. Nothing was uploaded.");
    const output = await encoder.readFile("output.mp4");
    if (!(output instanceof Uint8Array) || output.byteLength === 0) throw new Error("Couldn't save the watermarked video.");
    const blob = new Blob([new Uint8Array(output)], { type: "video/mp4" });
    progress?.("DTT video ready. Uploading…", 95);
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-dtt.mp4`, { type: "video/mp4" });
  } finally {
    encoder.terminate();
    processingVideo = false;
  }
}

/** Only the branded output may be uploaded; errors never fall back to the original. */
export async function watermarkCreatorMedia(file: File, progress?: WatermarkProgress): Promise<File> {
  if (file.type.startsWith("image/")) return imageWithMark(file, progress);
  if (file.type.startsWith("video/")) return videoWithMark(file, progress);
  throw new Error("Choose a photo or video to add DTT branding.");
}