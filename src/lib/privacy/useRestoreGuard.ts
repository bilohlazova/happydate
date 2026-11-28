"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { supabase } from "@/lib/supabaseClient";

// Components outside PrivateSnapshotBoundary that show owner data ("/" is public, so the home and the global
// header cannot live inside it) use this guard to get the same BFCache protection: the private DOM is removed before the page
// is cached (pagehide) and shown again only after supabase.auth.getUser() confirms the same owner.
// auth-js emits no event when a restored page finds its storage empty, so AuthProvider alone can keep
// showing a stale owner.
//   verifying  -> private content hidden, check in flight (or retry pending)
//   unverified -> check failed (offline/error): hidden, retry available
//   foreign    -> no session or another account: private content stays hidden, guest view is shown
export type RestoreState = "verifying" | "unverified" | "foreign" | null;

function sessionIsGone(error: { name?: string; status?: number } | null): boolean {
  return error?.name === "AuthSessionMissingError" || error?.status === 401 || error?.status === 403;
}

export function useRestoreGuard(ownerId: string | null, onVerified: () => void) {
  const [stored, setStored] = useState<{ ownerId: string; value: Exclude<RestoreState, null> } | null>(null);
  const generation = useRef(0);
  const failed = useRef(false);
  const verifyRef = useRef<() => void>(() => {});
  const onVerifiedRef = useRef(onVerified);

  useEffect(() => { onVerifiedRef.current = onVerified; }, [onVerified]);

  useEffect(() => {
    if (!ownerId) return;
    let mounted = true;

    async function verify() {
      const run = ++generation.current;
      failed.current = false;
      setStored({ ownerId: ownerId as string, value: "verifying" });
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!mounted || run !== generation.current) return;
        if (error && !sessionIsGone(error)) throw error;
        if (!error && data.user?.id === ownerId) {
          setStored(null);
          onVerifiedRef.current();
        } else {
          setStored({ ownerId: ownerId as string, value: "foreign" });
        }
      } catch {
        if (!mounted || run !== generation.current) return;
        failed.current = true;
        setStored({ ownerId: ownerId as string, value: "unverified" });
      }
    }
    verifyRef.current = () => { void verify(); };

    function hideBeforeCache() {
      generation.current += 1;
      flushSync(() => setStored({ ownerId: ownerId as string, value: "verifying" }));
    }
    function restore(event: PageTransitionEvent) { if (event.persisted) void verify(); }
    function retryWhenOnline() { if (failed.current) void verify(); }

    window.addEventListener("pagehide", hideBeforeCache);
    window.addEventListener("pageshow", restore);
    window.addEventListener("online", retryWhenOnline);
    return () => {
      mounted = false;
      generation.current += 1;
      window.removeEventListener("pagehide", hideBeforeCache);
      window.removeEventListener("pageshow", restore);
      window.removeEventListener("online", retryWhenOnline);
    };
  }, [ownerId]);

  const retry = useCallback(() => verifyRef.current(), []);
  const state: RestoreState = stored && stored.ownerId === ownerId ? stored.value : null;
  return { state, retry };
}
