"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { purgeLegacySymbolDrafts, purgeOwnerDrafts } from "@/lib/privateLocalDrafts";

// These routes hold account-owned snapshots, editors or person/gift inputs.
// Public pages (including guest HappyBot and the owner-gated home) stay public.
export function isPrivateSnapshotRoute(pathname: string): boolean {
  return ["/people", "/events", "/notes", "/dashboard", "/profile", "/settings", "/gift/start", "/care/add-memory", "/survey", "/onboarding-preview"]
    .some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export default function PrivateSnapshotBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const ownerId = user?.id ?? null;
  const previousOwner = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (loading) return;
    // Sign-out or account switch: the previous owner's private local drafts must not outlive the session.
    const previous = previousOwner.current;
    if (previous && previous !== ownerId) { purgeOwnerDrafts(previous); purgeLegacySymbolDrafts(); }
    previousOwner.current = ownerId;
  }, [loading, ownerId]);
  return isPrivateSnapshotRoute(pathname)
    ? <OwnedPrivateSnapshot routeKey={pathname}>{children}</OwnedPrivateSnapshot>
    : children;
}

function OwnedPrivateSnapshot({ children, routeKey }: { children: ReactNode; routeKey: string }) {
  const { user, loading } = useAuth();
  const ownerId = user?.id ?? null;
  const t = useTranslations("navigation");
  // null = normal navigation; an object = a BFCache restore needs a verified owner.
  const [restoration, setRestoration] = useState<{ ownerId: string | null; failed?: boolean } | null>(null);
  const restoringRef = useRef(false);
  const verificationRef = useRef(0);
  const verifyRef = useRef<() => void>(() => undefined);
  const failedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    async function verifyRestoredOwner() {
      const verification = ++verificationRef.current;
      failedRef.current = false; // a pending check must not be duplicated by further online events
      // A retry starts from the closed spinner state, never from stale private content.
      setRestoration((current) => (current?.failed ? { ownerId: null } : current));
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!mounted || verification !== verificationRef.current) return;
        // Failure is distinguishable from "verified, but signed out" so the user can retry.
        failedRef.current = Boolean(error);
        setRestoration(error ? { ownerId: null, failed: true } : { ownerId: data.user?.id ?? null });
      } catch {
        if (mounted && verification === verificationRef.current) { failedRef.current = true; setRestoration({ ownerId: null, failed: true }); }
      }
    }
    verifyRef.current = () => void verifyRestoredOwner();
    function hideBeforeCache() {
      restoringRef.current = true;
      verificationRef.current += 1;
      // Remove private DOM, portals and state before the browser freezes the page.
      flushSync(() => setRestoration({ ownerId: null }));
    }
    function restore(event: PageTransitionEvent) {
      if (event.persisted) void verifyRestoredOwner();
    }
    window.addEventListener("pagehide", hideBeforeCache);
    window.addEventListener("pageshow", restore);
    // Network returned after a failed restore verification: verify again (never show content unverified).
    function retryWhenOnline() { if (failedRef.current) void verifyRestoredOwner(); }
    window.addEventListener("online", retryWhenOnline);
    // An auth event may arrive while a persisted page is being restored.
    if (restoringRef.current) void verifyRestoredOwner();
    return () => {
      mounted = false;
      verificationRef.current += 1;
      window.removeEventListener("pagehide", hideBeforeCache);
      window.removeEventListener("pageshow", restore);
      window.removeEventListener("online", retryWhenOnline);
    };
  }, [ownerId]);

  // Render-time gate, not an effect cleanup: foreign snapshots never commit.
  if (restoration?.failed) {
    return (
      <div role="alert">
        <p>{t("privateRestore.unverified")}</p>
        <button type="button" onClick={() => verifyRef.current()}>{t("privateRestore.retry")}</button>
      </div>
    );
  }
  if (loading || (restoration !== null && restoration.ownerId !== ownerId)) {
    return <div role="status" aria-busy="true" />;
  }
  if (!ownerId) return <Link href="/auth/login">{t("header.login")}</Link>;

  // Every descendant snapshot and pending callback belongs to this owner/route.
  // Changing either unmounts the old tree, including HappyBot and editor portals.
  // Same-owner token refresh preserves this identity and all local state.
  return <Fragment key={`${ownerId}:${routeKey}`}>{children}</Fragment>;
}
