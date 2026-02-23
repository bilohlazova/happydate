// src/app/about/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HappyDate – O nas | Platforma online",
  description:
    "HappyDate to nowoczesna platforma online do zarządzania ważnymi datami i wyboru prezentów. Kalendarz, AI i emocje – w jednym miejscu.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "HappyDate – O nas",
    description:
      "HappyDate to cyfrowy produkt, który pomaga pamiętać o ważnych datach i wybierać trafione prezenty dzięki AI i personalizacji.",
    type: "website",
    url: "https://happydate.pl/about",
  },
  twitter: { card: "summary_large_image" },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-rose-50 to-amber-50">
      {/* HERO */}
      <section className="text-center py-24 px-6 bg-gradient-to-r from-sky-100 via-pink-100 to-amber-100">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900">
          O nas – HappyDate 🎁
        </h1>
        <p className="mt-6 text-lg md:text-xl text-slate-700 max-w-3xl mx-auto">
          HappyDate to platforma online, która pomaga pamiętać o ważnych datach
          i wybierać prezenty bez stresu. Łączymy technologię, AI i ludzką
          wrażliwość, aby tworzyć prawdziwe emocje – nie przypadkowe upominki.
        </p>
        <p className="mt-5 text-lg md:text-xl text-slate-800 max-w-3xl mx-auto">
          🌟 Wierzymy, że każdy chce czuć się ważny.  
          Tworzymy narzędzie, które zamienia intencję i pamięć w realne gesty.
        </p>
      </section>

      {/* MISJA */}
      <section className="py-16 container mx-auto px-6 max-w-5xl">
        <div className="rounded-3xl bg-white shadow-xl ring-1 ring-black/5 p-8 md:p-10">
          <h2 className="text-3xl font-extrabold text-slate-900">
            Nasza misja
          </h2>
          <p className="mt-4 text-slate-700 leading-relaxed">
            Chcemy uprościć cały proces: od pamiętania o ważnych datach,
            przez wybór prezentu, aż po jego realizację.
            HappyDate to osobiste konto użytkownika z kalendarzem wydarzeń
            oraz inteligentnymi rekomendacjami AI, które pomagają podejmować
            dobre decyzje we właściwym momencie.
            Technologia wspiera – emocje pozostają w centrum.
          </p>
        </div>
      </section>

      {/* WARTOŚCI */}
      <section className="py-8 container mx-auto px-6 max-w-5xl">
        <h3 className="text-2xl font-extrabold text-center mb-10">
          Nasze wartości
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: "💛",
              h: "Empatia",
              p: "Projektujemy doświadczenie wokół ludzi i relacji, nie samych funkcji.",
            },
            {
              icon: "🔒",
              h: "Zaufanie",
              p: "Szanujemy prywatność i dane. Działamy transparentnie i bez presji.",
            },
            {
              icon: "✨",
              h: "Prostota",
              p: "Jedna platforma, jasne kroki i realna pomoc – bez zbędnego chaosu.",
            },
          ].map((v) => (
            <div
              key={v.h}
              className="bg-white rounded-2xl p-6 shadow ring-1 ring-black/5"
            >
              <div className="text-3xl">{v.icon}</div>
              <h4 className="mt-3 font-semibold text-lg">{v.h}</h4>
              <p className="mt-2 text-slate-600">{v.p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* JAK DZIAŁA */}
      <section className="py-16 container mx-auto px-6 max-w-5xl">
        <h3 className="text-2xl font-extrabold text-center mb-10">
          Jak działa HappyDate?
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              n: 1,
              t: "Tworzysz swój kalendarz",
              d: "Dodajesz urodziny, rocznice i ważne chwile w jednym miejscu.",
            },
            {
              n: 2,
              t: "Otrzymujesz podpowiedzi",
              d: "AI analizuje kontekst i sugeruje dopasowane pomysły.",
            },
            {
              n: 3,
              t: "Działasz bez stresu",
              d: "Wiesz co, kiedy i dla kogo – bez nerwowych decyzji na ostatnią chwilę.",
            },
          ].map((s) => (
            <div
              key={s.n}
              className="bg-white rounded-2xl p-6 text-center shadow ring-1 ring-black/5"
            >
              <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-sky-100 text-sky-700 font-bold">
                {s.n}
              </div>
              <h4 className="mt-3 font-semibold">{s.t}</h4>
              <p className="mt-2 text-slate-600">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* KONTAKT / OPEN IDEAS */}
      <section className="py-16 container mx-auto px-6 max-w-4xl">
        <div className="rounded-3xl bg-white shadow-xl ring-1 ring-black/5 p-8 md:p-10 text-center">
          <h3 className="text-2xl font-extrabold text-slate-900">
            Masz pomysł? Napisz do nas.
          </h3>
          <p className="mt-3 text-slate-700 max-w-xl mx-auto">
            HappyDate to rozwijający się produkt cyfrowy.
            Jeśli widzisz coś, co może go ulepszyć – chętnie to przeczytamy.
          </p>
          <div className="mt-6 flex flex-col items-center gap-2">
            <a
              href="mailto:hello@happydate.pl"
              className="inline-block rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 px-8 py-3 font-semibold text-white shadow hover:shadow-lg transition"
            >
              hello@happydate.pl
            </a>
            <p className="text-xs text-slate-500 mt-2">
              Nie prowadzimy programu partnerskiego ani rekrutacji.
              Odpowiadamy na wartościowe wiadomości.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
