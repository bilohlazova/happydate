"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

// These routes hold account-owned snapshots, editors or person/gift inputs.
// Public pages (including guest HappyBot and the owner-gated home) stay public.
export function isPrivateSnapshotRoute(pathname: string): boolean {
  return ["/people", "/events", "/notes", "/dashboard", "/profile", "/settings", "/gift/start", "/care/add-memory", "/survey", "/onboarding-preview"]
    .some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export default function PrivateSnapshotBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return isPrivateSnapshotRoute(pathname)
    ? <OwnedPrivateSnapshot routeKey={pathname}>{children}</OwnedPrivateSnapshot>
    : children;
}

function OwnedPrivateSnapshot({ children, routeKey }: { children: ReactNode; routeKey: string }) {
  const { user, loading } = useAuth();
  const ownerId = user?.id ?? null;
  const t = useTranslations("navigation");
  // null = normal navigation; an object = a BFCache restore needs a verified owner.
  const [restoration, setRestoration] = useState<{ ownerId: string | null } | null>(null);
  const restoringRef = useRef(false);
  const verificationRef = useRef(0);

  useEffect(() => {
    let mounted = true;
    async function verifyRestoredOwner() {
      const verification = ++verificationRef.current;
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!mounted || verification !== verificationRef.current) return;
        setRestoration({ ownerId: error ? null : data.user?.id ?? null });
      } catch {
        if (mounted && verification === verificationRef.current) setRestoration({ ownerId: null });
      }
    }
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
    // An auth event may arrive while a persisted page is being restored.
    if (restoringRef.current) void verifyRestoredOwner();
    return () => {
      mounted = false;
      verificationRef.current += 1;
      window.removeEventListener("pagehide", hideBeforeCache);
      window.removeEventListener("pageshow", restore);
    };
  }, [ownerId]);

  // Render-time gate, not an effect cleanup: foreign snapshots never commit.
  if (loading || (restoration !== null && restoration.ownerId !== ownerId)) {
    return <div role="status" aria-busy="true" />;
  }
  if (!ownerId) return <Link href="/auth/login">{t("header.login")}</Link>;

  // Every descendant snapshot and pending callback belongs to this owner/route.
  // Changing either unmounts the old tree, including HappyBot and editor portals.
  // Same-owner token refresh preserves this identity and all local state.
  return <Fragment key={`${ownerId}:${routeKey}`}>{children}</Fragment>;
}
