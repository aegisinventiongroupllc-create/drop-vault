// Shrinks phone camera photos in memory before upload so large or unusual
// camera files don't fail on slow mobile connections. Falls back to the original.
export async function normalizeSelfie(file: File, maxSide = 1280): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) return file;
    return new File([blob], "selfie.jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}
