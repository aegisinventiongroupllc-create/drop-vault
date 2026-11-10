// Publicly shared links always point to DTT, including when created in preview.
export const DTT_PUBLIC_ORIGIN = "https://dropthatthing.com";

export const publicCreatorUrl = (creator: string) =>
  `${DTT_PUBLIC_ORIGIN}/?creator=${encodeURIComponent(creator)}`;

export const publicParticipantInvitationUrl = (token: string) =>
  `${DTT_PUBLIC_ORIGIN}/participant-invite#${encodeURIComponent(token)}`;