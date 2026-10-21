import type { HomeViewModel } from "./home.types";

export interface HomeSnapshot {
  ownerId: string;
  viewModel: HomeViewModel;
}

export function selectRenderableHomeSnapshot(
  snapshot: HomeSnapshot | null,
  currentUserId: string | null,
  authLoading: boolean,
): HomeViewModel | null {
  if (authLoading || !currentUserId || !snapshot || snapshot.ownerId !== currentUserId) return null;
  return snapshot.viewModel;
}
