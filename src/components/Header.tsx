"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabaseClient";
import { BOTTOM_NAV_ITEMS, HEADER_NAV_ITEMS, isAppShellPath } from "@/i18n/shellNavigation";
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
  const router = useRouter();
  const [isLoggedIn,    setIsLoggedIn]    = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const synchronizedProfileRef = useRef<string | null>(null);
  const appShell = isAppShellPath(pathname);

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
        className={cx(
          "sticky top-0 z-40 border-b backdrop-blur-xl",
          appShell
            ? "border-slate-200/80 bg-white/92 shadow-[0_4px_18px_rgba(15,23,42,0.045)]"
            : "border-white/25 bg-[linear-gradient(100deg,#249fbd_0%,#35b8cb_58%,#55cbd8_100%)] shadow-[0_8px_22px_rgba(36,159,189,0.13)]",
        )}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className={cx("mx-auto flex h-14 w-full items-center justify-between px-4 sm:px-6", appShell ? "max-w-[1160px]" : "max-w-5xl")}>

          {/* LOGO */}
          <Link href="/" className={cx("min-w-0 truncate text-lg font-extrabold", appShell ? "text-slate-950" : "text-white")}>
            🎁 HappyDate
          </Link>

          {/* DESKTOP NAV */}
          <nav
            className={cx("hidden items-center text-sm md:flex", appShell ? "gap-1" : "gap-6 text-white")}
            aria-label={translate("header.navigationLabel")}
          >
            {(appShell ? BOTTOM_NAV_ITEMS : HEADER_NAV_ITEMS).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  appShell ? "rounded-xl px-3 py-2 font-bold transition-colors" : "transition",
                  appShell
                    ? ((item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)) ? "bg-cyan-50 text-[#19778f]" : "text-slate-600 hover:bg-slate-50 hover:text-[#19778f]")
                    : pathname.startsWith(item.href) ? "font-semibold underline" : "opacity-90 hover:opacity-100"
                )}
              >
                {translate(`${appShell ? "bottom" : "header"}.${item.labelKey}` as never)}
              </Link>
            ))}
          </nav>

          {/* RIGHT SIDE */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher isAuthenticated={isLoggedIn} />
            {/* Login — тільки якщо не залогінений */}
            {!isLoggedIn && !appShell && (
              <Link
                href="/auth/login"
                className="hd-button min-h-9 bg-white/18 px-3 text-sm font-bold text-white"
              >
                {translate("header.login")}
              </Link>
            )}

            {/* HAMBURGER — мобільний доступ до тих самих посилань */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className={cx("hd-icon-button hd-mobile-menu-button text-xl", appShell ? "hidden text-slate-700" : "text-white")}
              aria-label={translate(
                mobileMenuOpen ? "header.closeMenu" : "header.openMenu",
              )}
              aria-expanded={mobileMenuOpen}
              aria-controls="happydate-mobile-menu"
            >
              ☰
            </button>
          </div>
        </div>

        {/* MOBILE MENU */}
        {mobileMenuOpen && !appShell && (
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
