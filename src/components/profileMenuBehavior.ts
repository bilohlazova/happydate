export type ProfileMenuCloseReason = "escape" | "outside-pointer";

export function shouldRestoreProfileFocus(reason: ProfileMenuCloseReason): boolean {
  return reason === "escape";
}
