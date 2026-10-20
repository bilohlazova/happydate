export function isCurrentHomeLoad(
  requestId: number,
  activeRequestId: number,
  requestOwnerId: string,
  activeOwnerId: string | null,
): boolean {
  return requestId === activeRequestId && requestOwnerId === activeOwnerId;
}
