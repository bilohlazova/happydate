export type InboxStatus = "idle" | "loading" | "ready" | "error" | "unauthorized" | "unavailable";

export interface InboxSnapshot<T> {
  ownerId: string;
  status: InboxStatus;
  items: T[];
  unreadCount: number;
  page: number;
  hasMore: boolean;
  failedPage?: number;
  failedAppend?: boolean;
}

export function mergeInboxPage<T>(
  current: InboxSnapshot<T> | null,
  ownerId: string,
  page: number,
  items: T[],
  unreadCount: number,
  hasMore: boolean,
  append: boolean,
): InboxSnapshot<T> {
  const canAppend = append && current?.ownerId === ownerId;
  return {
    ownerId,
    status: "ready",
    items: canAppend ? [...current.items, ...items] : items,
    unreadCount: Math.max(0, unreadCount),
    page,
    hasMore,
  };
}

export function markInboxPageFailure<T>(
  current: InboxSnapshot<T> | null,
  ownerId: string,
  page: number,
  append: boolean,
  status: Extract<InboxStatus, "error" | "unavailable" | "unauthorized">,
  preserveCurrent = true,
): InboxSnapshot<T> {
  const sameOwner = preserveCurrent && current?.ownerId === ownerId;
  return {
    ownerId,
    status,
    items: sameOwner ? current.items : [],
    unreadCount: sameOwner ? current.unreadCount : 0,
    page: sameOwner ? current.page : 0,
    hasMore: false,
    failedPage: page,
    failedAppend: append,
  };
}

export function applyInboxReadMutation<T extends { id: string; readAt: string | null }>(
  current: InboxSnapshot<T>,
  id: string,
  nextItem: T,
): InboxSnapshot<T> {
  const previous = current.items.find((item) => item.id === id);
  const becameRead = Boolean(previous && !previous.readAt && nextItem.readAt);
  return {
    ...current,
    items: current.items.map((item) => item.id === id ? nextItem : item),
    unreadCount: Math.max(0, current.unreadCount - (becameRead ? 1 : 0)),
  };
}

export function selectRenderableInbox<T>(
  snapshot: InboxSnapshot<T> | null,
  currentUserId: string | null,
  authLoading: boolean,
): InboxSnapshot<T> | null {
  if (authLoading || !currentUserId || !snapshot || snapshot.ownerId !== currentUserId) return null;
  return snapshot;
}
