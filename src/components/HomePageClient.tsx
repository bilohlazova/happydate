"use client";

import HomeHero from "@/components/home/HomeHero";
import Link from "next/link";
import { useEffect, useState } from "react";

const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // noop
    }
  },
};

function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (!safeStorage.getItem("happydate_cookie_consent")) {
        setVisible(true);
      }
    });

    return () => cancelAnimationFrame(id);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(var(--hd-nav-height)+env(safe-area-inset-bottom))] z-50 bg-slate-950/95 px-4 py-3 text-white md:bottom-0">
      <div className="mx-auto flex max-w-[430px] flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-[13px] font-medium leading-snug">
          Używamy cookies zgodnie z{" "}
          <Link
            href="/privacy"
            className="text-sky-300 underline"
          >
            Polityką Prywatności
          </Link>
          .
        </p>
        <button
          onClick={() => {
            safeStorage.setItem("happydate_cookie_consent", "true");
            setVisible(false);
          }}
          className="hd-button min-h-9 bg-sky-500 px-4 text-[13px] text-white"
        >
          Akceptuję
        </button>
      </div>
    </div>
  );
}

export default function HomePageClient() {
  return (
    <main className="hd-screen overflow-x-hidden">
      <div className="hd-container hd-container-wide hd-page-pad">
        <HomeHero />
      </div>

      <CookieConsent />
    </main>
  );
}
