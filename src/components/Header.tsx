// src/components/Header.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { useAvatar } from "@/hooks/useAvatar";

function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

type NavItem = {
  href: string;
  label: string;
  match: (p: string) => boolean;
  icon?: string;
};

const NAV_BASE: NavItem[] = [
  { href: "/", label: "Strona główna", match: (p) => p === "/" },
  { href: "/services", label: "Usługi", match: (p) => p.startsWith("/services") },
  { href: "/dashboard", label: "Moje wydarzenia", match: (p) => p.startsWith("/dashboard") },
  { href: "/notes", label: "Notatki", match: (p) => p.startsWith("/notes") },
  { href: "/about", label: "O nas", match: (p) => p.startsWith("/about") },
  { href: "/reviews", label: "Opinie", match: (p) => p.startsWith("/reviews") },
];

type Lang = "pl" | "ua" | "en" | "ru" | "de";
const FLAG: Record<Lang, string> = {
  pl: "🇵🇱",
  ua: "🇺🇦",
  en: "🇬🇧",
  ru: "🇷🇺",
  de: "🇩🇪",
};
const LANG_LABEL: Record<Lang, string> = {
  pl: "Polski",
  ua: "Українська",
  en: "English",
  ru: "Русский",
  de: "Deutsch",
};

export default function Header() {
  const pathname = usePathname();

const [user, setUser] = useState<User | null>(null);

// admin більше не використовується — видаляємо role і loadingRole

const [profileMenuOpen, setProfileMenuOpen] = useState(false);
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
const [langOpen, setLangOpen] = useState(false);
const [audioOpen, setAudioOpen] = useState(false);
const [lang, setLang] = useState<Lang>("pl");

const profileMenuRef = useRef<HTMLDivElement | null>(null);
const langRef = useRef<HTMLDivElement | null>(null);

const { url: avatarUrl } = useAvatar(user?.id);

  // auth
  useEffect(() => {
  let cancelled = false;

  (async () => {
    const { data } = await supabase.auth.getUser();
    if (!cancelled) setUser(data?.user ?? null);
  })();

  const { data: authListener } = supabase.auth.onAuthStateChange((_evt, session) => {
    if (!cancelled) setUser(session?.user ?? null);
  });

  return () => {
    cancelled = true;
    authListener?.subscription?.unsubscribe();
  };
}, []);



  // init lang
  useEffect(() => {
    const supported: Lang[] = ["pl", "ua", "en", "ru", "de"];
    const stored = (typeof window !== "undefined" &&
      localStorage.getItem("lang")) as Lang | null;
    if (stored && supported.includes(stored)) setLang(stored);
  }, []);

  // close on outside click / ESC
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (profileMenuOpen && profileMenuRef.current && !profileMenuRef.current.contains(t))
        setProfileMenuOpen(false);
      if (langOpen && langRef.current && !langRef.current.contains(t))
        setLangOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setProfileMenuOpen(false);
        setLangOpen(false);
        setAudioOpen(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [profileMenuOpen, langOpen, mobileMenuOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfileMenuOpen(false);
  };

  const avatarFallback = user?.email ? user.email[0].toUpperCase() : "🙂";

  // NAV з Admin для адміна
  const NAV: NavItem[] = NAV_BASE;

  return (
  <>
    <header
  className="bg-gradient-to-r from-blue-400 to-cyan-400 sticky top-0 z-50 pb-3 sm:pb-4"
  style={{ paddingTop: "max(env(safe-area-inset-top), 12px)" }}
>
  <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-8">
    <div className="flex justify-between items-center">

      {/* Logo */}
      <div className="flex items-center gap-2">
        <Link href="/" className="text-2xl font-bold hover:underline text-white">
          🎁 HappyDate
        </Link>

        <span className="hidden md:inline ml-2 text-base italic text-white/90">
          Twój ciepły asystent prezentowy
        </span>

        <button
          onClick={() => setAudioOpen(true)}
          title="Posłuchaj nas"
          className="text-white text-2xl p-2 rounded hover:bg-white/10 transition focus:ring-2 focus:ring-cyan-300"
        >
          ✨
        </button>

      </div>

            {/* Hamburger for mobile */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="text-white text-3xl sm:hidden p-2 rounded hover:bg-white/10 focus:ring-2 focus:ring-cyan-300 transition"
              aria-label="Menu"
              aria-expanded={mobileMenuOpen}
            >
              ☰
            </button>
          </div>

          {/* Desktop nav */}
          <nav className="hidden sm:block mt-4 text-white">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div className="flex gap-4 md:gap-6 items-center">
                {NAV.map((item) => {
                  const active = item.match(pathname);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cx(
                        "px-1 py-0.5 rounded focus:bg-white/30 transition flex items-center gap-1",
                        active
                          ? "bg-white/20 underline font-semibold"
                          : "hover:bg-white/20"
                      )}
                    >
                      {item.icon && <span>{item.icon}</span>}
                      {item.label}
                      
                    </Link>
                  );
                })}
              </div>

              {/* Right side */}
              <div className="flex gap-3 items-center flex-wrap">
                {/* Language */}
                <div className="relative" ref={langRef}>
                  <button
                    onClick={() => setLangOpen((v) => !v)}
                    className="flex items-center gap-2 px-3 py-2 rounded border bg-white/10 text-white hover:bg-white/20 transition focus:ring-2 focus:ring-blue-300"
                  >
                    <span>{FLAG[lang]}</span>
                    <svg
                      className={cx("w-4 h-4 transition-transform", langOpen && "rotate-180")}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {langOpen && (
                    <div className="absolute right-0 mt-2 bg-white shadow-xl rounded-xl z-50 py-2 min-w-[150px]">
                      {(["pl", "ua", "en", "ru", "de"] as Lang[]).map((code) => (
                        <button
                          key={code}
                          onClick={() => {
                            setLang(code);
                            localStorage.setItem("lang", code);
                            setLangOpen(false);
                          }}
                          className={cx(
                            "w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-blue-100",
                            code === lang && "font-semibold"
                          )}
                        >
                          <span>{FLAG[code]}</span>
                          {LANG_LABEL[code]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Auth */}
                {!user ? (
                  <>
                    <Link
                      href="/auth/login"
                      className="px-3 py-1.5 rounded-xl bg-white text-blue-700 font-semibold text-sm hover:bg-blue-50"
                    >
                      Zaloguj się
                    </Link>
                    <Link
                      href="/auth/register"
                      className="px-3 py-1.5 rounded-xl bg-white/10 text-white font-semibold text-sm hover:bg-white/20"
                    >
                      Rejestracja
                    </Link>
                  </>
                ) : (
                  <div className="relative" ref={profileMenuRef}>
                    <button
                      onClick={() => setProfileMenuOpen((v) => !v)}
                      className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white/30 text-white hover:bg-white/40"
                    >
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatarUrl}
                          alt="Avatar"
                          className="h-10 w-10 rounded-full object-cover border-2 border-white shadow"
                        />
                      ) : (
                        <span className="text-sm font-bold">{avatarFallback}</span>
                      )}
                    </button>

                    {profileMenuOpen && (
                      <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white text-gray-700 shadow-lg ring-1 ring-black/5 z-50">
                        <div className="border-b border-gray-100 px-4 py-3">
                          <p className="text-xs text-gray-500">Zalogowano jako</p>
                          <p className="truncate text-sm font-semibold">{user?.email}</p>
                         
                        </div>
                        <Link
                          href="/profile"
                          onClick={() => setProfileMenuOpen(false)}
                          className="block px-4 py-2 text-sm hover:bg-gray-100"
                        >
                          Mój profil
                        </Link>
                        <Link
                          href="/settings"
                          onClick={() => setProfileMenuOpen(false)}
                          className="block px-4 py-2 text-sm hover:bg-gray-100"
                        >
                          Ustawienia
                        </Link>
                       
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                        >
                          Wyloguj się
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </nav>

          {/* Mobile nav */}
          {mobileMenuOpen && (
            <nav className="sm:hidden mt-4 bg-white rounded-xl shadow-lg p-4 space-y-2">
              {NAV.map((item) => {
                const active = item.match(pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cx(
                      "block px-3 py-2 rounded-lg transition flex items-center gap-1",
                      active ? "bg-blue-100 text-blue-800 font-semibold" : "hover:bg-gray-100 text-gray-700"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.icon && <span>{item.icon}</span>}
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </header>

      {/* Audio modal */}
      {audioOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAudioOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold mb-1">Krótka zapowiedź</h3>
            <p className="text-sm text-gray-600 mb-4">
              Ciepło, emocje i prezenty — odkryj HappyDate w 30 sekund 💛
            </p>
            <audio controls className="w-full mb-4">
              <source src="/audio/intro.mp3" type="audio/mpeg" />
              Twoja przeglądarka nie wspiera audio.
            </audio>
            <div className="text-right">
              <button onClick={() => setAudioOpen(false)} className="px-4 py-2 rounded-lg border">
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
