// src/app/services/na-okazje/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "HappyDate – Na Ślub, Rocznicę, Urodziny",
  description:
    "Wspólny prezent dla pary młodej lub jubilata. Koordynujemy całość od A do Z: pomysł, budżet, zakup, pakowanie i dostawę na czas.",
  alternates: { canonical: "/services/na-okazje" },
  openGraph: {
    title: "HappyDate – Na Ślub, Rocznicę, Urodziny",
    description:
      "Zróbmy wspólny prezent z efektem „wow”. My zajmiemy się wszystkim: od pomysłu po dostawę.",
    type: "website",
    url: "https://happydate.pl/services/na-okazje",
  },
  twitter: { card: "summary_large_image" },
};

function Bullet({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-white/80 backdrop-blur p-5 shadow-sm ring-1 ring-black/5">
      <div className="flex items-start gap-3">
        <div className="text-2xl">{icon}</div>
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-slate-600 text-sm">{text}</p>
        </div>
      </div>
    </div>
  );
}

export default function NaOkazjePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-rose-50 to-amber-50">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(56,189,248,0.25),rgba(0,0,0,0)_60%)]" />
        <div className="mx-auto max-w-6xl px-4 pt-20 pb-16 md:pt-24 md:pb-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
              💍 Na Ślub, Rocznicę, Urodziny
            </p>
            <p className="mt-4 text-lg md:text-xl text-slate-600">
              Wspólny prezent dla pary młodej lub jubilata. Koordynujemy całość od A do Z – Ty
              mówisz „co i dla kogo”, my robimy resztę.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/survey?flow=gift-concierge"
                className="inline-flex items-center rounded-2xl px-6 py-3 font-semibold text-white shadow-lg ring-1 ring-black/5 bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:from-fuchsia-600 hover:to-pink-600"
              >
                Zacznij od krótkiej ankiety 🎁
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center rounded-2xl bg-white/80 backdrop-blur px-6 py-3 font-semibold text-slate-900 shadow ring-1 ring-black/5 hover:-translate-y-0.5 transition"
              >
                Dodaj datę w kalendarzu 📅
              </Link>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-[-32px] h-16 rounded-t-[32px] bg-white" />
      </section>

      {/* Dla kogo i jak to działa */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center text-slate-900">
            Dla kogo to jest?
          </h2>
          <p className="mt-3 text-center text-slate-600 max-w-3xl mx-auto">
            Dla świadków, przyjaciół, rodziny i współpracowników, którzy chcą zrobić wspólny, dobrze
            zorganizowany prezent — bez biegania po sklepach i bez stresu.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <Bullet
              icon="🤝"
              title="Zrzutka bez chaosu"
              text="Ustalamy budżet, tworzymy link do wpłat, pilnujemy terminów i transparentnie raportujemy."
            />
            <Bullet
              icon="🎯"
              title="Pomysł dopasowany"
              text="AI + konsultant ludzki. Zbieramy preferencje i proponujemy 2–3 opcje w różnych budżetach."
            />
            <Bullet
              icon="🚚"
              title="Dostawa na czas"
              text="Kupno, pakowanie, kartka, personalizacja i wysyłka. Dostarczamy dokładnie na datę."
            />
          </div>

          <h2 className="mt-14 text-2xl md:text-3xl font-extrabold text-center text-slate-900">
            Jak to działa — 4 kroki
          </h2>
          <div className="mt-6 grid gap-5 md:grid-cols-4">
            {[
              { n: 1, t: "Ustalasz okazję, budżet i termin." },
              { n: 2, t: "Wysyłamy link do zrzutki i zbieramy wpłaty." },
              { n: 3, t: "Wybierasz z 2–3 propozycji (AI + konsultant)." },
              { n: 4, t: "My kupujemy, pakujemy i dostarczamy na czas." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 flex items-center justify-center rounded-full bg-sky-50 text-sky-800 font-bold">
                    {s.n}
                  </div>
                  <p className="text-slate-700">{s.t}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Przykładowe zestawy */}
      <section className="py-16 md:py-20 bg-white">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center text-slate-900">
            Przykładowe zestawy prezentowe
          </h2>
          <p className="mt-3 text-center text-slate-600 max-w-3xl mx-auto">
            Każdy zestaw możemy spersonalizować kartką, grawerem lub wiadomością wideo.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                t: "Elegancki box ślubny",
                d: "Wino musujące, szkło, kartka z życzeniami i voucher do SPA.",
              },
              {
                t: "Rocznica — kolacja&spa",
                d: "Kwiaty + voucher na kolację dla dwojga + masaż relaksacyjny.",
              },
              {
                t: "Urodzinowy „wow”",
                d: "Balony, słodycze premium, kartka i mini-vouchery przeżyć.",
              },
            ].map((card) => (
              <article key={card.t} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                <h3 className="font-semibold text-slate-900">{card.t}</h3>
                <p className="mt-2 text-sm text-slate-600">{card.d}</p>
                <div className="mt-4">
                  <Link
                    href="/survey?flow=gift-concierge"
                    className="inline-flex items-center rounded-xl border px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    Zapytaj o wycenę →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Cennik w skrócie */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center text-slate-900">
            Cennik w skrócie
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                name: "Planer",
                price: "19 zł / mies.",
                items: ["Przypomnienia o datach", "Lista pomysłów AI", "Eksport/Import .ics"],
              },
              {
                name: "Concierge",
                price: "49 zł / mies.",
                items: ["Konsultant + AI", "Propozycje 2–3 opcji", "Koordynacja zakupu i pakowania"],
              },
              {
                name: "Zrzutka PRO",
                price: "prowizja 3–5%",
                items: ["Link do wpłat", "Raport wpłat", "Dostawa na termin"],
              },
            ].map((p) => (
              <div key={p.name} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
                <h3 className="text-lg font-semibold text-slate-900">{p.name}</h3>
                <p className="mt-1 text-2xl font-extrabold">{p.price}</p>
                <ul className="mt-3 list-disc pl-5 text-sm text-slate-600 space-y-1">
                  {p.items.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
                <Link
                  href="/survey?flow=gift-concierge"
                  className="mt-4 inline-flex rounded-xl bg-pink-500 px-4 py-2 text-sm font-semibold text-white shadow hover:shadow-lg"
                >
                  Zamów rozmowę
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20 bg-white">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center text-slate-900">
            Najczęstsze pytania
          </h2>
          <div className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white overflow-hidden">
            {[
              {
                q: "Jak działa zrzutka?",
                a: "Tworzymy bezpieczny link do wpłat, widzisz postęp i listę osób (lub anonimowo). Po zakończeniu rozliczamy i wysyłamy potwierdzenie.",
              },
              {
                q: "Czy mogę zapłacić kartą/Apple/Google Pay?",
                a: "Tak — obsługujemy płatności online. Dla firm wystawiamy fakturę.",
              },
              {
                q: "Czy personalizujecie kartkę i opakowanie?",
                a: "Tak. Dodamy imiona, datę, krótką dedykację, a nawet wideo-wiadomość (link/QR).",
              },
              {
                q: "Czy dostarczacie w konkretnym dniu?",
                a: "Tak. Planujemy dostawę na wskazany termin — także w weekendy i święta (po uzgodnieniu).",
              },
            ].map((f) => (
              <details key={f.q} className="group p-4 open:bg-slate-50">
                <summary className="cursor-pointer list-none font-semibold text-slate-900 flex items-center justify-between">
                  {f.q}
                  <span className="text-slate-400 transition group-open:rotate-180">⌄</span>
                </summary>
                <p className="mt-2 text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/survey?flow=gift-concierge"
              className="inline-flex items-center rounded-2xl px-6 py-3 font-semibold text-white shadow-lg ring-1 ring-black/5 bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:from-fuchsia-600 hover:to-pink-600"
            >
              Porozmawiajmy o Twoim prezencie →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
