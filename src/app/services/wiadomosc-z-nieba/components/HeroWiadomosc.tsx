"use client";

import Link from "next/link";

export default function HeroWiadomosc() {
  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      {/* subtelne pastelowe „bloby” */}
      <span className="pointer-events-none absolute -left-10 top-16 h-52 w-52 rounded-full bg-pink-200/30 blur-3xl" />
      <span className="pointer-events-none absolute -right-12 top-32 h-64 w-64 rounded-full bg-sky-200/40 blur-3xl" />
      <span className="pointer-events-none absolute left-1/3 bottom-0 h-56 w-56 translate-y-1/3 rounded-full bg-indigo-200/30 blur-3xl" />

      <div className="container relative z-10 mx-auto max-w-5xl px-6 text-center">
        {/* Szklana karta – jasna jak na innych usługach */}
        <div className="rounded-3xl border border-white/70 bg-white/70 px-6 py-10 shadow-[0_20px_60px_-20px_rgba(0,0,0,.15)] backdrop-blur-lg md:px-14 md:py-14">
          <p className="text-sm tracking-wide text-slate-600">
            Zatrzymaj chwilę, która będzie trwać wiecznie ✨
          </p>

          <h1 className="mt-3 text-4xl font-extrabold leading-tight text-slate-900 md:text-5xl">
            Wiadomość z Nieba ✉️
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-700 md:text-xl">
            Twoje słowa mają moc. Mogą pocieszać, wzruszać i dawać nadzieję –
            nawet wtedy, gdy Ciebie już nie będzie obok. Napisz list albo nagraj
            wideo, a my bezpiecznie je przechowamy i dostarczymy we wskazanym
            dniu.
          </p>

          {/* tagi */}
          <ul className="mt-7 flex flex-wrap justify-center gap-3">
            {[
              "Dla bliskich na odległość",
              "Na ważny dzień w przyszłości",
              "Z sercem, bez pośpiechu",
            ].map((t) => (
              <li
                key={t}
                className="rounded-full bg-white/80 px-4 py-1.5 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200"
              >
                {t}
              </li>
            ))}
          </ul>

          {/* CTA */}
          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="#pricing"
              className="inline-flex items-center rounded-2xl bg-gradient-to-r from-fuchsia-500 to-pink-500 px-8 py-3 font-semibold text-white shadow-lg transition hover:scale-[1.02] active:scale-95"
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
        </div>
      </div>
    </section>
  );
}
