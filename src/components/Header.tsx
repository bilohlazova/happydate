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
  const footerTranslate = useTranslations("navigation.footer");
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string; user_metadata?: Record<string, unknown> } | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const isLoggedIn = Boolean(user);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const synchronizedProfileRef = useRef<string | null>(null);
  const appShell = isAppShellPath(pathname);

  useEffect(() => {
    // Route changes must close the menu; this state sync is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    const applyUser = async (user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null | undefined) => {
      if (cancelled) return;
      setUser(user ? { id: user.id, email: user.email, user_metadata: user.user_metadata } : null);
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
            {appShell && <Link href="/services" className={cx("rounded-xl px-3 py-2 font-bold transition-colors", pathname.startsWith("/services") ? "bg-cyan-50 text-[#19778f]" : "text-slate-600 hover:bg-slate-50 hover:text-[#19778f]")}>{translate("header.services")}</Link>}
          </nav>

          {/* RIGHT SIDE */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher isAuthenticated={isLoggedIn} />
            {/* Login — тільки якщо не залогінений */}
            {!user && (
              <Link
                href="/auth/login"
                className={cx("hd-button min-h-9 px-3 text-sm font-bold", appShell ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "bg-white/18 text-white")}
              >
                {translate("header.login")}
              </Link>
            )}
            {!user && <Link href="/auth/register" className={cx("hd-button min-h-9 px-3 text-sm font-bold", appShell ? "bg-cyan-600 text-white hover:bg-cyan-700" : "bg-white text-[#19778f]")}>{translate("header.register")}</Link>}
            {user && <div className="relative"><button onClick={() => setProfileOpen((v) => !v)} className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-100" aria-expanded={profileOpen}><span className="grid h-8 w-8 place-items-center rounded-full bg-cyan-100 text-cyan-700">👤</span><span className="hidden max-w-32 truncate sm:inline">{String(user.user_metadata?.full_name || user.user_metadata?.name || user.email || translate("header.account"))}</span></button>{profileOpen && <div className="absolute right-0 top-11 z-50 w-48 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"><Link className="block rounded-xl px-3 py-2 text-sm hover:bg-slate-50" href="/profile">{translate("header.profile")}</Link><Link className="block rounded-xl px-3 py-2 text-sm hover:bg-slate-50" href="/settings">{translate("header.settings")}</Link><button className="block w-full rounded-xl px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50" onClick={async () => { await supabase.auth.signOut(); setProfileOpen(false); }}>{translate("header.logout")}</button></div>}</div>}

            {/* HAMBURGER — мобільний доступ до тих самих посилань */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className={cx("hd-icon-button hd-mobile-menu-button text-xl md:hidden", appShell ? "text-slate-700" : "text-white")}
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
        {mobileMenuOpen && (
          <div
            id="happydate-mobile-menu"
            className="bg-white/96 shadow-lg backdrop-blur-xl sm:hidden"
          >
            {(appShell ? [{ href: "/services", labelKey: "services" }, { href: "/about", labelKey: "about" }, { href: "/profile", labelKey: "profile" }, { href: "/settings", labelKey: "settings" }, { href: "/contact", labelKey: "contact" }] : HEADER_NAV_ITEMS).map((item) => (
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
                {item.labelKey === "contact" ? footerTranslate("contact") : translate(`header.${item.labelKey}` as never)}
              </Link>
            ))}

            {/* Розділювач */}
            <div className="border-t border-gray-100 my-1" />

            {/* Виход — тільки якщо залогінений */}
            {user && (
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
