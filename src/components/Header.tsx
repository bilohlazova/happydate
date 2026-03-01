"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { useAvatar } from "@/hooks/useAvatar";
import Image from "next/image";

function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

type NavItem = {
  href: string;
  label: string;
  match: (p: string) => boolean;
};

const NAV: NavItem[] = [
  { href: "/", label: "Strona główna", match: (p) => p === "/" },
  { href: "/services", label: "Usługi", match: (p) => p.startsWith("/services") },
  { href: "/dashboard", label: "Moje wydarzenia", match: (p) => p.startsWith("/dashboard") },
  { href: "/notes", label: "Notatki", match: (p) => p.startsWith("/notes") },
  { href: "/about", label: "O nas", match: (p) => p.startsWith("/about") },
  { href: "/reviews", label: "Opinie", match: (p) => p.startsWith("/reviews") },
];

export default function Header() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const { url: avatarUrl } = useAvatar(user?.id);

  // AUTH
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!cancelled) setUser(data?.user ?? null);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!cancelled) setUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfileMenuOpen(false);
  };

  const avatarFallback = user?.email?.[0]?.toUpperCase() ?? "🙂";

  return (
    <>
      <header
        className="sticky top-0 z-40 bg-gradient-to-r from-blue-400 to-cyan-400"
        style={{
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        <div className="flex items-center justify-between px-4 h-14">

          {/* LOGO */}
          <Link
            href="/"
            className="text-white font-bold text-lg"
          >
            🎁 HappyDate
          </Link>

          {/* DESKTOP NAV */}
          <nav className="hidden sm:flex gap-6 text-white text-sm">
            {NAV.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cx(
                    "transition",
                    active ? "underline font-semibold" : "opacity-90 hover:opacity-100"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* RIGHT SIDE */}
          <div className="flex items-center gap-3">

            {!user ? (
              <Link
                href="/auth/login"
                className="text-white text-sm bg-white/20 px-3 py-1 rounded-lg"
              >
                Login
              </Link>
            ) : (
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setProfileMenuOpen((v) => !v)}
                  className="h-9 w-9 rounded-full overflow-hidden bg-white/30"
                >
                  {avatarUrl ? (
                    <Image
                  src={avatarUrl}
                  alt="Avatar"
                 width={36}
                 height={36}
                 className="object-cover rounded-full"
                 unoptimized
                />
                  ) : (
                    <span className="text-white text-sm font-bold">
                      {avatarFallback}
                    </span>
                  )}
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg py-2">
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm hover:bg-gray-100"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      Profil
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      Wyloguj
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* MOBILE MENU */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="sm:hidden text-white text-xl"
            >
              ☰
            </button>
          </div>
        </div>

        {/* MOBILE NAV */}
        {mobileMenuOpen && (
          <div className="sm:hidden bg-white shadow-lg">
            {NAV.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cx(
                    "block px-4 py-3 text-sm",
                    active ? "bg-blue-100 font-semibold" : "hover:bg-gray-100"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </header>
    </>
  );
}