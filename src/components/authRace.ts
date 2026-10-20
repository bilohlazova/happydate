export function shouldApplyInitialAuthResult(startVersion: number, currentVersion: number): boolean {
  return startVersion === currentVersion;
}

export function shouldApplyProfileResult(
  requestId: number,
  currentRequestId: number,
  requestedUserId: string | null,
  currentUserId: string | null,
): boolean {
  return requestId === currentRequestId && requestedUserId === currentUserId;
}
