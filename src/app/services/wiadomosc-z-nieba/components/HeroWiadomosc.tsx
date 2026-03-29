"use client";

import Link from "next/link";

export default function HeroWiadomosc() {
  return (
    <section className="relative overflow-hidden py-16 md:py-24">
      <span className="pointer-events-none absolute -left-10 top-16 h-52 w-52 rounded-full bg-sky-200/30 blur-3xl" />
      <span className="pointer-events-none absolute -right-12 top-32 h-64 w-64 rounded-full bg-blue-200/40 blur-3xl" />
      <span className="pointer-events-none absolute left-1/3 bottom-0 h-56 w-56 translate-y-1/3 rounded-full bg-cyan-200/30 blur-3xl" />

      <div className="container relative z-10 mx-auto max-w-5xl px-6 text-center">
        <div className="rounded-3xl border border-white/70 bg-white/80 px-6 py-10 shadow-[0_20px_60px_-20px_rgba(0,0,0,.12)] backdrop-blur-lg md:px-14 md:py-14">

          <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-4 py-1.5 text-sm font-semibold text-sky-700 ring-1 ring-sky-200 mb-4">
            🌙 Wiadomość z Nieba
          </div>

          <h1 className="mt-2 text-4xl font-extrabold leading-tight text-slate-900 md:text-5xl">
            Twoje słowa mogą dotrzeć<br className="hidden md:block" />
            <span className="text-sky-500"> nawet po latach</span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-600 md:text-xl">
            Napisz list lub nagraj wideo dla bliskiej osoby.
            Bezpiecznie przechowamy i dostarczymy go dokładnie w wybranym dniu —
            na urodziny, rocznicę, ślub lub inną ważną chwilę.
          </p>

          {/* Tagi */}
          <ul className="mt-6 flex flex-wrap justify-center gap-3">
            {["Dla bliskich na odległość", "Na ważny dzień w przyszłości", "Z sercem, bez pośpiechu"].map(t => (
              <li key={t} className="rounded-full bg-sky-50 px-4 py-1.5 text-sm text-sky-700 ring-1 ring-sky-200">
                {t}
              </li>
            ))}
          </ul>

          {/* CTA */}
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="#pricing"
              className="inline-flex items-center rounded-2xl bg-gradient-to-r from-sky-500 to-blue-500 px-8 py-3 font-semibold text-white shadow-lg transition hover:brightness-110 active:scale-95"
            >
              Zamów wiadomość
            </Link>
            <Link
              href="#jak-to-dziala"
              className="inline-flex items-center rounded-2xl bg-white px-7 py-3 font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              Zobacz, jak to działa
            </Link>
          </div>

          {/* Юридична підказка */}
          <p className="mt-6 text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
            Usługa ma charakter spersonalizowany. Po rozpoczęciu realizacji prawo do odstąpienia od umowy nie przysługuje (art. 38 pkt 3 ustawy o prawach konsumenta). Dane są szyfrowane i przechowywane zgodnie z RODO.
          </p>
        </div>
      </div>
    </section>
  );
}