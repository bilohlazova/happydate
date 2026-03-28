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
        className="sticky top-0 z-40 bg-gradient-to-r from-blue-400 to-cyan-400"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center justify-between px-4 h-14">

          {/* LOGO */}
          <Link href="/" className="text-white font-bold text-lg">
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
                className="text-white text-sm bg-white/20 px-3 py-1 rounded-lg"
              >
                Login
              </Link>
            )}

            {/* HAMBURGER — тільки мобільний */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="sm:hidden text-white text-xl"
              aria-label="Toggle menu"
            >
              ☰
            </button>
          </div>
        </div>

        {/* MOBILE MENU — тільки публічні сторінки */}
        {mobileMenuOpen && (
          <div className="sm:hidden bg-white shadow-lg">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cx(
                  "block px-4 py-3 text-sm",
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
                className="block w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-gray-100"
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