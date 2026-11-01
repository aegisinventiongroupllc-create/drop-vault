export const IDENTITY_IMAGE_LIMIT = 10 * 1024 * 1024;
export function identityAge(dob: string, today = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const date = new Date(`${dob}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== dob) return null;
  let age = today.getUTCFullYear() - date.getUTCFullYear();
  if (today.getUTCMonth() < date.getUTCMonth() || (today.getUTCMonth() === date.getUTCMonth() && today.getUTCDate() < date.getUTCDate())) age--;
  return age >= 0 && age <= 120 ? age : null;
}
export function validIdentityImage(file: Pick<File, "size" | "type">): boolean {
  return ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size > 0 && file.size <= IDENTITY_IMAGE_LIMIT;
}