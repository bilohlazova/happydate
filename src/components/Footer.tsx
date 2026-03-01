"use client";

import Link from "next/link";

const linkCls =
  "underline underline-offset-2 decoration-white/70 hover:text-white hover:decoration-white transition-colors duration-200";

export default function Footer() {
  return (
    <footer
      className="bg-gradient-to-r from-sky-400 to-cyan-400 text-white text-xs"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="px-4 py-4 text-center">

        {/* Copyright */}
        <p className="opacity-90">
          © {new Date().getFullYear()} HappyDate
        </p>

        {/* Legal links */}
        <nav
          className="mt-2 flex justify-center gap-3 flex-wrap opacity-90"
          aria-label="Dokumenty prawne"
        >
          <Link href="/regulamin" className={linkCls}>
            Regulamin
          </Link>
          <span>·</span>
          <Link href="/privacy" className={linkCls}>
            Polityka prywatności
          </Link>
          <span>·</span>
          <Link href="/regulamin-zwrotow" className={linkCls}>
            Zwroty
          </Link>
        </nav>

      </div>
    </footer>
  );
}