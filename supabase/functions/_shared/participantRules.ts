export function adultAtRecording(dob: string, recordedOn: string, today = new Date().toISOString().slice(0, 10)): boolean {
  const valid = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
  if (!valid(dob) || !valid(recordedOn) || recordedOn > today || dob > recordedOn) return false;
  const birth = new Date(dob), recording = new Date(recordedOn);
  let age = recording.getUTCFullYear() - birth.getUTCFullYear();
  if (recording.getUTCMonth() < birth.getUTCMonth() || (recording.getUTCMonth() === birth.getUTCMonth() && recording.getUTCDate() < birth.getUTCDate())) age--;
  return age >= 18 && age <= 120;
}
export const PARTICIPANT_CONSENT = "I voluntarily authorize the named uploader to distribute the exact content identified here through DTT Media LLC on Drop That Thing, for the stated use. I was at least 18 when it was recorded, consented to its production, and consent to this distribution. I have reviewed the content reference and understand that DTT can charge viewers. This permission does not create a DTT creator account or promise me payment. I may report disputed or unauthorized use to admin@dttmediallc.com. This draft requires qualified legal review and does not replace required production records.";