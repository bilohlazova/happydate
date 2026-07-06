// src/app/care/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HappyDate Care – Jesteśmy tu, żeby pomóc",
  description:
    "HappyDate Care to przestrzeń wsparcia i troski. Pomagamy z pytaniami, emocjami i codziennym korzystaniem z platformy.",
  alternates: { canonical: "/care" },
  openGraph: {
    title: "HappyDate Care",
    description:
      "Nie tylko technologia. HappyDate Care to wsparcie, zrozumienie i ludzka pomoc.",
    type: "website",
    url: "https://happydate.pl/care",
  },
  twitter: { card: "summary_large_image" },
};

export default function CarePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-rose-50 to-amber-50 pb-[calc(var(--hd-nav-height)+env(safe-area-inset-bottom))]">
      {/* HERO */}
      <section className="bg-gradient-to-r from-sky-100 via-pink-100 to-amber-100 px-4 py-12 text-center">
        <h1 className="text-[2.35rem] font-extrabold leading-tight text-slate-900 md:text-5xl">
          💛 HappyDate Care
        </h1>
        <p className="mx-auto mt-4 max-w-[var(--hd-screen-wide)] text-base font-medium leading-7 text-slate-700 md:text-xl">
          Czasem wystarczy, że ktoś po prostu jest.
          HappyDate Care to miejsce stworzone z myślą o wsparciu, spokoju
          i ludzkim podejściu — nawet w świecie technologii.
        </p>
      </section>

      {/* CZYM JEST CARE */}
      <section className="mx-auto max-w-[var(--hd-screen-wide)] px-4 py-8">
        <div className="hd-surface p-5">
          <h2 className="text-2xl font-extrabold text-slate-900">
            Czym jest HappyDate Care?
          </h2>
          <p className="mt-4 text-slate-700 leading-relaxed">
            HappyDate Care to nie jest klasyczne „centrum pomocy”.
            To przestrzeń, w której możesz zadać pytanie, podzielić się
            wątpliwością lub napisać wtedy, gdy coś jest dla Ciebie niejasne.
            Dbamy nie tylko o działanie platformy, ale też o komfort osób,
            które z niej korzystają.
          </p>
        </div>
      </section>

      {/* W CZYM POMAGAMY */}
      <section className="mx-auto max-w-[var(--hd-screen-wide)] px-4 py-6">
        <h3 className="mb-5 text-center text-2xl font-extrabold">
          W czym możemy pomóc?
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              icon: "🗓️",
              h: "Korzystanie z platformy",
              p: "Kalendarz wydarzeń, przypomnienia, ustawienia konta.",
            },
            {
              icon: "🎁",
              h: "Wybór prezentu",
              p: "Jak działają rekomendacje, sugestie AI i personalizacja.",
            },
            {
              icon: "💬",
              h: "Pytania i wątpliwości",
              p: "Jeśli coś jest niejasne lub po prostu chcesz zapytać.",
            },
          ].map((v) => (
            <div
              key={v.h}
              className="hd-surface p-4"
            >
              <div className="text-3xl">{v.icon}</div>
              <h4 className="mt-3 font-semibold text-lg">{v.h}</h4>
              <p className="mt-2 text-slate-600">{v.p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FILOZOFIA */}
      <section className="mx-auto max-w-[var(--hd-screen-wide)] px-4 py-8">
        <div className="hd-surface bg-gradient-to-br from-sky-50 to-pink-50 p-5">
          <h3 className="text-2xl font-extrabold text-slate-900">
            Nasze podejście
          </h3>
          <p className="mt-4 text-slate-700 leading-relaxed">
            Nie działamy na zasadzie automatycznych odpowiedzi.
            Czytamy wiadomości, rozumiemy kontekst i odpowiadamy po ludzku.
            Technologia jest ważna — ale relacje są ważniejsze.
          </p>
        </div>
      </section>

      {/* KONTAKT */}
      <section className="mx-auto max-w-[var(--hd-screen-wide)] px-4 py-8">
        <div className="hd-surface p-5 text-center">
          <h3 className="text-2xl font-extrabold text-slate-900">
            Napisz do HappyDate Care
          </h3>
          <p className="mt-3 text-slate-700 max-w-xl mx-auto">
            Jeśli coś Cię martwi, zastanawia lub po prostu potrzebujesz pomocy —
            jesteśmy tutaj.
          </p>
          <div className="mt-6 flex flex-col items-center gap-2">
            <a
              href="mailto:hello@happydate.pl"
              className="inline-block rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 px-8 py-3 font-semibold text-white shadow hover:shadow-lg transition"
            >
              hello@happydate.pl
            </a>
            <p className="text-xs text-slate-500 mt-2">
              Odpowiadamy możliwie szybko, z uważnością i szacunkiem.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
