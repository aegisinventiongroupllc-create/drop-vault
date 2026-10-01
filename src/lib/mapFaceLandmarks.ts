import type { AvatarConfig } from "@/components/ProfileAvatar";

type Point = { x: number; y: number };

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

const loadImage = (file: File): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const image = new Image();
  const objectUrl = URL.createObjectURL(file);
  image.onload = () => { URL.revokeObjectURL(objectUrl); resolve(image); };
  image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("This image could not be read.")); };
  image.src = objectUrl;
});

const averageRegion = (context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => {
  const pixels = context.getImageData(x, y, width, height).data;
  let red = 0, green = 0, blue = 0, samples = 0;
  for (let index = 0; index < pixels.length; index += 20) {
    if (pixels[index + 3] < 128) continue;
    red += pixels[index]; green += pixels[index + 1]; blue += pixels[index + 2]; samples += 1;
  }
  return samples ? { red: red / samples, green: green / samples, blue: blue / samples } : { red: 150, green: 115, blue: 90 };
};

let landmarkerPromise: Promise<import("@mediapipe/tasks-vision").FaceLandmarker> | undefined;
const getLandmarker = async () => {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm");
      return FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: "/models/mediapipe/face_landmarker.task" },
        runningMode: "IMAGE",
        numFaces: 1,
        minFaceDetectionConfidence: 0.65,
        minFacePresenceConfidence: 0.65,
        minTrackingConfidence: 0.65,
      });
    })();
  }
  return landmarkerPromise;
};

export async function mapFaceLandmarks(file: File, current: AvatarConfig): Promise<AvatarConfig> {
  const image = await loadImage(file);
  const landmarker = await getLandmarker();
  const result = landmarker.detect(image);
  const points = result.faceLandmarks[0];
  if (!points || points.length < 468) throw new Error("No clear face was found. Face the camera in even light and try again.");

  const faceWidth = distance(points[234], points[454]);
  const faceHeight = distance(points[10], points[152]);
  const eyeGap = distance(points[133], points[362]) / faceWidth;
  const noseWidth = distance(points[129], points[358]) / faceWidth;
  const jawWidth = distance(points[172], points[397]) / faceWidth;
  const chinRatio = faceHeight / faceWidth;
  const browRise = ((points[105].y + points[334].y) / 2 - (points[33].y + points[263].y) / 2) / faceHeight;
  const earHeight = (distance(points[127], points[162]) + distance(points[356], points[389])) / (2 * faceHeight);

  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 240;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Photo processing is unavailable on this device.");
  const size = Math.min(image.naturalWidth, image.naturalHeight);
  context.drawImage(image, (image.naturalWidth - size) / 2, (image.naturalHeight - size) / 2, size, size, 0, 0, 240, 240);
  const skin = averageRegion(context, 92, 94, 56, 54);
  const hair = averageRegion(context, 76, 28, 88, 42);
  const skinLight = skin.red * 0.299 + skin.green * 0.587 + skin.blue * 0.114;
  const hairLight = hair.red * 0.299 + hair.green * 0.587 + hair.blue * 0.114;
  const skinTone: AvatarConfig["skinTone"] = skinLight > 210 ? "light" : skinLight > 180 ? "warm" : skinLight > 145 ? "medium" : skinLight > 110 ? "deep" : skinLight > 78 ? "rich" : "dark";
  const hairColor: AvatarConfig["hairColor"] = hairLight < 55 ? "dark" : hair.red > hair.green * 1.3 ? "red" : hair.red > 145 && hair.green > 120 ? "blonde" : hairLight > 175 ? "silver" : "brown";

  const jawline: AvatarConfig["jawline"] = jawWidth > 0.82 ? "strong" : jawWidth > 0.76 ? "square" : chinRatio > 1.45 ? "tapered" : current.style === "woman" ? "heart" : "oval";
  const eyebrows: AvatarConfig["eyebrows"] = browRise < -0.11 ? "arched" : browRise > -0.065 ? "straight" : "soft";
  return {
    ...current,
    skinTone,
    hairColor,
    jawline,
    eyebrows,
    ears: earHeight > 0.14 ? "large" : earHeight < 0.085 ? "small" : "medium",
    eyeSpacing: eyeGap > 0.29 ? "wide" : eyeGap < 0.23 ? "close" : "balanced",
    noseShape: noseWidth > 0.31 ? "broad" : noseWidth < 0.24 ? "narrow" : "balanced",
  };
}