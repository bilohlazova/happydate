"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabaseClient";
import { HEADER_NAV_ITEMS, isAppShellPath } from "@/i18n/shellNavigation";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import { getLocaleCookie, setLocaleCookie } from "@/i18n/localeCookie";
import { shouldSynchronizeProfileLocale } from "@/i18n/profileLocaleSync";
import { getPreferredLocaleForUser } from "@/lib/repositories/profile/profileLocale.repository";

function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

export default function Header() {
  const translate = useTranslations("navigation");
  const pathname = usePathname();
  const isAppRoute = isAppShellPath(pathname);
  const router = useRouter();
  const [isLoggedIn,    setIsLoggedIn]    = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const synchronizedProfileRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const applyUser = async (user: { id: string } | null | undefined) => {
      if (cancelled) return;
      setIsLoggedIn(Boolean(user));
      if (!user) {
        synchronizedProfileRef.current = null;
        return;
      }
      const loadingKey = `loading:${user.id}`;
      if (synchronizedProfileRef.current === loadingKey) return;
      synchronizedProfileRef.current = loadingKey;
      try {
        const preferredLocale = await getPreferredLocaleForUser(user.id);
        if (cancelled || !preferredLocale) return;
        const synchronizationKey = `${user.id}:${preferredLocale}`;
        synchronizedProfileRef.current = synchronizationKey;
        if (shouldSynchronizeProfileLocale(preferredLocale, getLocaleCookie())) {
          setLocaleCookie(preferredLocale);
          router.refresh();
        }
      } catch {
        synchronizedProfileRef.current = null;
        // Authentication and navigation remain usable if preference loading fails.
      }
    };
    void supabase.auth.getUser().then(({ data }) => applyUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      void applyUser(session?.user);
    });
    return () => {
      cancelled = true;
      listener?.subscription?.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileMenuOpen]);

  return (
    <>
      <header
        className="sticky top-0 z-40 border-b border-white/20 bg-gradient-to-r from-sky-500/95 to-cyan-400/95 shadow-[0_8px_22px_rgba(14,165,233,0.12)] backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="hd-container flex h-14 items-center justify-between">

          {/* LOGO */}
          <Link href="/" className="min-w-0 truncate text-lg font-extrabold text-white">
            🎁 HappyDate
          </Link>

          {/* DESKTOP NAV — тільки публічні сторінки */}
          <nav
            className={`gap-6 text-sm text-white ${isAppRoute ? "hidden" : "hidden sm:flex"}`}
            aria-label={translate("header.navigationLabel")}
          >
            {!isAppRoute && HEADER_NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "transition",
                  pathname.startsWith(item.href)
                    ? "underline font-semibold"
                    : "opacity-90 hover:opacity-100"
                )}
              >
                {translate(`header.${item.labelKey}`)}
              </Link>
            ))}
          </nav>

          {/* RIGHT SIDE */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher isAuthenticated={isLoggedIn} />
            {/* Login — тільки якщо не залогінений */}
            {!isLoggedIn && (
              <Link
                href="/auth/login"
                className="hd-button min-h-9 bg-white/18 px-3 text-sm font-bold text-white"
              >
                {translate("header.login")}
              </Link>
            )}

            {/* HAMBURGER — тільки мобільний */}
            {!isAppRoute && <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="hd-icon-button hd-mobile-menu-button text-xl text-white"
              aria-label={translate(
                mobileMenuOpen ? "header.closeMenu" : "header.openMenu",
              )}
              aria-expanded={mobileMenuOpen}
              aria-controls="happydate-mobile-menu"
            >
              ☰
            </button>}
          </div>
        </div>

        {/* MOBILE MENU — тільки публічні сторінки */}
        {!isAppRoute && mobileMenuOpen && (
          <div
            id="happydate-mobile-menu"
            className="bg-white/96 shadow-lg backdrop-blur-xl sm:hidden"
          >
            {HEADER_NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cx(
                  "block min-h-11 px-4 py-3 text-sm font-semibold",
                  pathname.startsWith(item.href)
                    ? "bg-blue-100 font-semibold"
                    : "hover:bg-gray-100"
                )}
              >
                {translate(`header.${item.labelKey}`)}
              </Link>
            ))}

            {/* Розділювач */}
            <div className="border-t border-gray-100 my-1" />

            {/* Виход — тільки якщо залогінений */}
            {isLoggedIn && (
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  setMobileMenuOpen(false);
                }}
                className="block min-h-11 w-full px-4 py-3 text-left text-sm font-semibold text-red-500 hover:bg-gray-100"
              >
                🚪 {translate("header.logout")}
              </button>
            )}
          </div>
        )}
      </header>
    </>
  );
}
