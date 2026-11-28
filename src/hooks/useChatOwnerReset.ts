"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";

/**
 * Calls `onOwnerChange` when the authenticated owner changes after it was first
 * resolved (sign-out, account switch, guest → user). The first resolution after
 * page load is not a change. A token refresh keeps the same user id, so it never
 * triggers a reset. Pages use it to drop private chat inputs (scope, gift request,
 * initial prompt, open flag) that live outside the modal.
 */
export function useChatOwnerReset(onOwnerChange: () => void): void {
  const { user, loading } = useAuth();
  const previousOwner = useRef<string | null | undefined>(undefined);
  const callback = useRef(onOwnerChange);

  useEffect(() => {
    callback.current = onOwnerChange;
  }, [onOwnerChange]);

  const owner = user?.id ?? null;
  useEffect(() => {
    if (loading) return;
    const previous = previousOwner.current;
    previousOwner.current = owner;
    if (previous === undefined || previous === owner) return;
    callback.current();
  }, [loading, owner]);
}
