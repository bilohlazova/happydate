"use client";

import Link from "next/link";

const linkCls =
  "underline underline-offset-2 decoration-white/70 hover:text-white hover:decoration-white transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white rounded-sm";

export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-sky-400 to-cyan-400 text-white py-6 text-center text-sm mt-10">
      {/* Copyright */}
      <p>
        © {new Date().getFullYear()} HappyDate. Z miłością tworzymy
        niezapomniane chwile.
      </p>

      {/* Legal links */}
      <nav
        className="mt-2 flex justify-center gap-3 flex-wrap text-white/90"
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
          Zwroty i reklamacje
        </Link>
      </nav>

      
    </footer>
  );
}
