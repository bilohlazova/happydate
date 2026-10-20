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
import { useAuth } from "@/components/AuthProvider";
import NotificationInbox from "@/components/notifications/NotificationInbox";
import { shouldRestoreProfileFocus } from "@/components/profileMenuBehavior";

function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

export default function Header() {
  const translate = useTranslations("navigation");
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const profileFirstItemRef = useRef<HTMLAnchorElement>(null);
  const isLoggedIn = Boolean(user);
  const isAuthPage = pathname.startsWith("/auth/");
  const isOnboardingPage = pathname.startsWith("/onboarding-preview");
  const isFocusedFlow = isAuthPage || isOnboardingPage;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const synchronizedProfileRef = useRef<string | null>(null);
  const appShell = isAppShellPath(pathname) && Boolean(user);
  const lightHeader = true;

  useEffect(() => {
    // Route changes must close the menu; this state sync is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    const applyLocale = async () => {
      if (cancelled || !user) {
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
    void applyLocale();
    return () => {
      cancelled = true;
    };
  }, [router, user]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!profileOpen) return;
    profileFirstItemRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
        if (shouldRestoreProfileFocus("escape")) profileButtonRef.current?.focus();
      }
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node) && !profileButtonRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
        if (shouldRestoreProfileFocus("outside-pointer")) profileButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
    };
  }, [profileOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!mobileMenuRef.current?.contains(event.target as Node) && !mobileMenuButtonRef.current?.contains(event.target as Node)) {
        setMobileMenuOpen(false);
        mobileMenuButtonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [mobileMenuOpen]);

  return (
    <>
      <header
        className={cx(
          "sticky top-0 z-40 border-b backdrop-blur-xl",
          lightHeader
            ? "border-slate-200/80 bg-white/92 shadow-[0_4px_18px_rgba(15,23,42,0.045)]"
            : "border-white/25 bg-[linear-gradient(100deg,#249fbd_0%,#35b8cb_58%,#55cbd8_100%)] shadow-[0_8px_22px_rgba(36,159,189,0.13)]",
        )}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex h-14 w-full max-w-[1160px] items-center justify-between px-4 sm:px-6">

          {/* LOGO */}
          <Link href="/" className="hd-brand-link min-w-0 shrink-0 whitespace-nowrap text-lg font-extrabold text-slate-950">
            🎁 HappyDate
          </Link>

          {/* DESKTOP NAV */}
          {!isFocusedFlow && <nav
            className="hidden items-center gap-1 text-sm md:flex"
            aria-label={translate("header.navigationLabel")}
          >
            {(appShell ? BOTTOM_NAV_ITEMS : HEADER_NAV_ITEMS).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "rounded-xl px-3 py-2 font-bold transition-colors",
                  appShell
                    ? ((item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)) ? "bg-cyan-50 text-[#19778f]" : "text-slate-600 hover:bg-slate-50 hover:text-[#19778f]")
                    : (pathname.startsWith(item.href) ? "bg-cyan-50 text-[#19778f]" : "text-slate-600 hover:bg-slate-50 hover:text-[#19778f]")
                )}
              >
                {translate(`${appShell ? "bottom" : "header"}.${item.labelKey}` as never)}
              </Link>
            ))}
            {appShell && <Link href="/services" className={cx("rounded-xl px-3 py-2 font-bold transition-colors", pathname.startsWith("/services") ? "bg-cyan-50 text-[#19778f]" : "text-slate-600 hover:bg-slate-50 hover:text-[#19778f]")}>{translate("header.services")}</Link>}
          </nav>}

          {/* RIGHT SIDE */}
          <div className="hd-public-header-actions flex shrink-0 items-center gap-3">
            <LanguageSwitcher isAuthenticated={isLoggedIn} variant="header-light" />
            {!isFocusedFlow && user && <NotificationInbox />}
            {/* Login — тільки якщо не залогінений */}
            {!isFocusedFlow && <div ref={profileMenuRef} className="relative"><button type="button" ref={profileButtonRef} onClick={() => { setProfileOpen((v) => !v); setMobileMenuOpen(false); }} className="flex min-h-11 items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-100" aria-label={translate("header.account")} aria-haspopup="true" aria-expanded={profileOpen} aria-controls="happydate-profile-menu"><span className="grid h-8 w-8 place-items-center rounded-full bg-cyan-100 text-cyan-700">👤</span><span className="hidden max-w-32 truncate sm:inline">{user ? (profile?.firstName || translate("header.account")) : translate("header.account")}</span></button>{profileOpen && <div id="happydate-profile-menu" className="absolute right-0 top-12 z-50 w-48 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">{user ? <><Link ref={profileFirstItemRef} className="block min-h-11 rounded-xl px-3 py-3 text-sm hover:bg-slate-50" href="/profile" onClick={() => setProfileOpen(false)}>{translate("header.profile")}</Link><Link className="block min-h-11 rounded-xl px-3 py-3 text-sm hover:bg-slate-50" href="/settings" onClick={() => setProfileOpen(false)}>{translate("header.settings")}</Link><button type="button" className="block min-h-11 w-full rounded-xl px-3 py-3 text-left text-sm text-red-600 hover:bg-red-50" onClick={async () => { await supabase.auth.signOut(); setProfileOpen(false); }}>{translate("header.logout")}</button></> : <><Link ref={profileFirstItemRef} className="block min-h-11 rounded-xl px-3 py-3 text-sm hover:bg-slate-50" href="/auth/login" onClick={() => setProfileOpen(false)}>{translate("header.login")}</Link><Link className="block min-h-11 rounded-xl px-3 py-3 text-sm hover:bg-slate-50" href="/auth/register" onClick={() => setProfileOpen(false)}>{translate("header.register")}</Link></>}</div>}</div>}

            {/* HAMBURGER — мобільний доступ до тих самих посилань */}
            {!isFocusedFlow && <button
              ref={mobileMenuButtonRef}
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="hd-icon-button hd-mobile-menu-button text-xl text-slate-700 md:hidden"
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

        {/* MOBILE MENU */}
        {mobileMenuOpen && !isFocusedFlow && (
          <div
            id="happydate-mobile-menu"
            ref={mobileMenuRef}
            className="happydate-mobile-menu z-50 bg-white shadow-[0_16px_34px_rgba(15,23,42,0.14)] md:hidden"
          >
            {[{ href: "/services", labelKey: "services" }, { href: "/about", labelKey: "about" }].map((item) => (
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
                {translate(`header.${item.labelKey}` as never)}
              </Link>
            ))}

          </div>
        )}
      </header>
    </>
  );
}
