"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

// Тільки публічні сторінки — без дублів з Bottom Nav
const NAV = [
  { href: "/services", label: "Usługi",  match: (p: string) => p.startsWith("/services") },
  { href: "/reviews",  label: "Opinie",  match: (p: string) => p.startsWith("/reviews")  },
  { href: "/about",    label: "O nas",   match: (p: string) => p.startsWith("/about")    },
];

export default function Header() {
  const pathname = usePathname();
  const [isLoggedIn,    setIsLoggedIn]    = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!cancelled) setIsLoggedIn(!!data?.user);
    })();
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!cancelled) setIsLoggedIn(!!session?.user);
    });
    return () => {
      cancelled = true;
      listener?.subscription?.unsubscribe();
    };
  }, []);

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
          <nav className="hidden sm:flex gap-6 text-white text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "transition",
                  item.match(pathname)
                    ? "underline font-semibold"
                    : "opacity-90 hover:opacity-100"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* RIGHT SIDE */}
          <div className="flex items-center gap-3">
            {/* Login — тільки якщо не залогінений */}
            {!isLoggedIn && (
              <Link
                href="/auth/login"
                className="hd-button min-h-9 bg-white/18 px-3 text-sm font-bold text-white"
              >
                Login
              </Link>
            )}

            {/* HAMBURGER — тільки мобільний */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="hd-icon-button sm:hidden text-xl text-white"
              aria-label="Toggle menu"
            >
              ☰
            </button>
          </div>
        </div>

        {/* MOBILE MENU — тільки публічні сторінки */}
        {mobileMenuOpen && (
          <div className="sm:hidden bg-white/96 shadow-lg backdrop-blur-xl">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cx(
                  "block min-h-11 px-4 py-3 text-sm font-semibold",
                  item.match(pathname)
                    ? "bg-blue-100 font-semibold"
                    : "hover:bg-gray-100"
                )}
              >
                {item.label}
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
                🚪 Wyloguj
              </button>
            )}
          </div>
        )}
      </header>
    </>
  );
}
