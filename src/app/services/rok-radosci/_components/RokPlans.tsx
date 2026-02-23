"use client";

import { useState } from "react";
import Link from "next/link";

/** Typ sezonu */
type Season = "mix" | "wiosna" | "lato" | "jesien" | "zima";
/** Typ rozliczania */
type Billing = "monthly" | "yearly";

/** Warstwy tła dla sezonów (radial + akcent) */
const SEASON_BG: Record<Exclude<Season, "mix">, string> = {
  wiosna:
    "radial-gradient(900px 480px at 10% 10%, rgba(255,182,193,.45), transparent 60%)," +
    "radial-gradient(700px 420px at 20% 20%, rgba(144,238,144,.35), transparent 55%)," +
    "linear-gradient(180deg,#FFFFFF 0%,#FFFDFC 100%)",
  lato:
    "radial-gradient(900px 480px at 90% 8%, rgba(255,230,130,.45), transparent 60%)," +
    "radial-gradient(700px 420px at 80% 22%, rgba(64,224,208,.28), transparent 55%)," +
    "linear-gradient(180deg,#FFFFFF 0%,#FFFDFC 100%)",
  jesien:
    "radial-gradient(900px 520px at 15% 85%, rgba(255,165,0,.35), transparent 60%)," +
    "radial-gradient(700px 420px at 20% 75%, rgba(178,34,34,.20), transparent 55%)," +
    "linear-gradient(180deg,#FFFFFF 0%,#FFFDFC 100%)",
  zima:
    "radial-gradient(900px 520px at 85% 90%, rgba(173,216,230,.40), transparent 60%)," +
    "radial-gradient(700px 420px at 80% 80%, rgba(216,191,216,.28), transparent 55%)," +
    "linear-gradient(180deg,#FFFFFF 0%,#FFFDFC 100%)",
};

/** Emotki sezonów do legendy */
const EMOJI: Record<Exclude<Season, "mix">, string> = {
  wiosna: "🌷",
  lato: "☀️",
  jesien: "🍁",
  zima: "❄️",
};

export default function RokPlans() {
  const [season, setSeason] = useState<Season>("mix");
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <>
      {/* HERO — z przełącznikiem sezonów */}
      <section className="relative isolate overflow-hidden py-20 text-center">
        {/* Warstwy тła */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {(["wiosna", "lato", "jesien", "zima"] as Exclude<Season, "mix">[]).map((s) => (
            <div
              key={s}
              className={`absolute inset-0 transition-opacity duration-500 ${
                season === "mix" || season === s ? "opacity-100" : "opacity-0"
              }`}
              style={{ background: SEASON_BG[s], willChange: "opacity" }}
            />
          ))}
        </div>

        {/* dekor: subtelne emotki w rogach */}
        <span className="pointer-events-none absolute left-6 top-8 text-5xl opacity-40">🌷</span>
        <span className="pointer-events-none absolute right-8 top-10 text-5xl opacity-40">☀️</span>
        <span className="pointer-events-none absolute left-8 bottom-10 text-5xl opacity-35">🍁</span>
        <span className="pointer-events-none absolute right-10 bottom-8 text-5xl opacity-35">❄️</span>

        <div className="relative z-10 mx-auto max-w-3xl px-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/75 px-4 py-1 text-sm font-semibold text-pink-700 shadow-sm backdrop-blur">
            Rok Radości <span className="text-base">🎁</span>
          </div>

          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            12 miesięcy małych i dużych niespodzianek
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-slate-700 dark:text-slate-300">
            Jedna decyzja — cały rok z przypomnieniami i pomysłami od AI i doradców.
            Spokój, czułość i prezenty na czas — <span className="whitespace-nowrap">na każdą porę roku.</span>
          </p>

          {/* Przełącznik сезонів */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {[
              { key: "mix", label: "Mix" },
              { key: "wiosna", label: `${EMOJI.wiosna} Wiosna` },
              { key: "lato", label: `${EMOJI.lato} Lato` },
              { key: "jesien", label: `${EMOJI.jesien} Jesień` },
              { key: "zima", label: `${EMOJI.zima} Zima` },
            ].map(({ key, label }) => {
              const active = season === (key as Season);
              return (
                <button
                  key={key}
                  onClick={() => setSeason(key as Season)}
                  className={`h-9 rounded-full px-4 text-sm transition ${
                    active
                      ? "bg-pink-600 text-white shadow-lg shadow-pink-600/20"
                      : "bg-white/85 text-slate-900 border border-white/70 hover:bg-white"
                  }`}
                  aria-pressed={active}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* хвиля-відділювач */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10">
          <svg viewBox="0 0 1440 100" preserveAspectRatio="none" className="h-16 w-full text-white dark:text-gray-900">
            <path d="M0,64 C240,96 480,0 720,32 C960,64 1200,80 1440,32 L1440,100 L0,100 Z" fill="currentColor" />
          </svg>
        </div>
      </section>

      {/* JAK TO DZIAŁA */}
      <section id="how" className="py-16 bg-white dark:bg-gray-900">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 dark:text-white">
            Jak to działa?
          </h2>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
            {[
              { n: 1, t: "Dodajesz daty do kalendarza" },
              { n: 2, t: "Ustawiasz budżet i styl" },
              { n: 3, t: "AI + doradca podpowiadają" },
              { n: 4, t: "Ty decydujesz – my przypominamy" },
            ].map(({ n, t }) => (
              <div key={n} className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-6 shadow">
                <div className="text-3xl font-extrabold text-pink-600">{n}</div>
                <p className="mt-3 text-slate-700 dark:text-slate-300">{t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANY I CENY */}
      <section id="plans" className="py-20 bg-gradient-to-b from-white to-pink-50 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col items-center">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">Wybierz swój plan</h2>

            {/* тумблер оплати */}
            <div className="mt-6 flex items-center gap-4">
              <span className={billing === "monthly" ? "font-bold" : ""}>Miesięcznie</span>
              <button
                onClick={() => setBilling(billing === "monthly" ? "yearly" : "monthly")}
                aria-label="Przełącz rozliczanie"
                className="relative inline-flex h-6 w-12 items-center rounded-full bg-pink-500"
              >
                <span
                  className={`${billing === "yearly" ? "translate-x-6" : "translate-x-1"} inline-block h-4 w-4 transform rounded-full bg-white transition`}
                />
              </button>
              <span className={billing === "yearly" ? "font-bold" : ""}>Rocznie (2 mies. gratis)</span>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Planer */}
            <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-800 p-8 shadow hover:shadow-lg">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Planer</h3>
              <p className="mt-2 text-slate-600 dark:text-slate-400">
                Dla osób, które chcą tylko przypomnienia i pomysły.
              </p>
              <p className="mt-4 text-3xl font-extrabold text-pink-600">
                {billing === "monthly" ? "19 zł/mies." : "199 zł/rok"}
              </p>
              <ul className="mt-6 space-y-3 text-slate-700 dark:text-slate-300">
                <li>✔ Przypomnienia (mail/SMS)</li>
                <li>✔ Nielimitowane podpowiedzi AI</li>
                <li>✔ Checklisty zakupowe</li>
                <li>✔ 1×/kwartał mini-konsultacja</li>
              </ul>
              <Link
                href={`/services/rok-radosci/plan/planer?billing=${billing}`}
                className="mt-8 block rounded-2xl bg-pink-600 px-6 py-3 text-center text-white font-semibold shadow hover:bg-pink-700"
              >
                Wybierz Planer
              </Link>
            </div>

            {/* Concierge */}
            <div className="rounded-2xl border border-pink-500 bg-pink-50 dark:bg-slate-800 p-8 shadow-lg">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Concierge</h3>
              <p className="mt-2 text-slate-600 dark:text-slate-400">
                AI + doradca człowiek – do 12 wydarzeń rocznie.
              </p>
              <p className="mt-4 text-3xl font-extrabold text-pink-600">
                {billing === "monthly" ? "49 zł/mies." : "499 zł/rok"}
              </p>
              <ul className="mt-6 space-y-3 text-slate-700 dark:text-slate-300">
                <li>✔ Wszystko z Planer</li>
                <li>✔ Doradca online (chat/mail)</li>
                <li>✔ Do 12 wydarzeń w roku</li>
                <li>✔ Gotowe linki zakupowe (Allegro, Empik)</li>
                <li>✔ Koordynacja i przypomnienia</li>
              </ul>
              <Link
                href={`/services/rok-radosci/plan/concierge?billing=${billing}`}
                className="mt-8 block rounded-2xl bg-pink-600 px-6 py-3 text-center text-white font-semibold shadow hover:bg-pink-700"
              >
                Wybierz Concierge
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Sticky (mobile) */}
      <div className="fixed bottom-0 left-0 right-0 bg-pink-600 px-6 py-4 text-white shadow-lg md:hidden">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Dołącz do Rok Radości 🎁</span>
          <a href="#plans" className="rounded-xl bg-white px-4 py-2 text-pink-600 font-bold">
            Wybierz plan
          </a>
        </div>
      </div>
    </>
  );
}
