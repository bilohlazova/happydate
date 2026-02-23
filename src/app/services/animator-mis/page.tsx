// src/app/services/animator-mis/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "HappyDate – Animator w Stroju Misia (dla dzieci)",
  description:
    "Duży miś + uśmiech dziecka = wspomnienie na całe życie. Słodka wizyta, wręczenie prezentów i mini-animacje „wow”.",
  alternates: { canonical: "/services/animator-mis" },
  openGraph: {
    title: "HappyDate – Animator w Stroju Misia",
    description:
      "Misiowa magia prosto do Twojego domu: czuła wizyta, zabawa i pamiątkowe zdjęcia.",
    type: "website",
    url: "https://happydate.pl/services/animator-mis",
  },
  twitter: { card: "summary_large_image" },
};

export default function AnimatorMisPage() {
  return (
    <main className="relative overflow-hidden">
      {/* pastelowe tło spójne z resztą serwisu */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-pink-50 via-amber-50 to-sky-50" />
      <div className="absolute inset-x-0 bottom-[-36px] -z-10 h-10 rounded-t-[36px] bg-white" />

      {/* HERO */}
      <section className="py-20 md:py-24">
        <div className="container mx-auto max-w-5xl px-6 text-center">
          <p className="inline-flex items-center gap-2 mx-auto rounded-full bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1 text-xs font-semibold">
            🐻 Nowość • Animator w stroju misia
          </p>
          <h1 className="mt-5 text-4xl md:text-5xl font-extrabold text-slate-900">
            Misiowa wizyta u Twojego dziecka
          </h1>
          <p className="mt-4 text-lg md:text-xl text-slate-700">
            Duży miś + uśmiech = wspomnienie na całe życie. Delikatna animacja,
            wręczenie prezentów i pamiątkowe zdjęcia.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/survey"
              className="rounded-2xl px-6 py-3 font-semibold text-white shadow-lg ring-1 ring-black/5
                         bg-gradient-to-r from-[#ff4f8b] to-[#ff6e64] transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              Zamów wizytę misia 🎁
            </Link>
            <Link
              href="#pricing"
              className="rounded-2xl bg-white/80 backdrop-blur-md px-6 py-3 font-semibold text-slate-900 shadow-lg
                         border border-white/70 ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              Zobacz cennik
            </Link>
          </div>
        </div>
      </section>

      {/* CO TO JEST */}
      <section className="py-16">
        <div className="container mx-auto max-w-5xl px-6">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 text-center">
            Na czym polega usługa?
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              {
                emoji: "🎁",
                h: "Wręczenie prezentu",
                p: "Miś przekazuje Twój prezent w ciepły, bajkowy sposób — można dodać krótkie życzenia.",
              },
              {
                emoji: "🎉",
                h: "Mini-animacja",
                p: "5–10 minut lekkiej zabawy: przybicie piątek, proste pląsy, wspólne zdjęcia.",
              },
              {
                emoji: "📸",
                h: "Pamiątka na zawsze",
                p: "Zdjęcia i krótkie wideo — pomożemy wszystko ująć, aby została piękna pamiątka.",
              },
            ].map((b) => (
              <article
                key={b.h}
                className="rounded-2xl bg-white/90 border border-white/70 ring-1 ring-black/5 shadow-sm p-6"
              >
                <div className="text-3xl">{b.emoji}</div>
                <h3 className="mt-3 text-xl font-semibold text-slate-900">{b.h}</h3>
                <p className="mt-2 text-slate-700">{b.p}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* JAK TO DZIAŁA */}
      <section className="py-16 bg-white">
        <div className="container mx-auto max-w-5xl px-6">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 text-center">
            Jak to działa?
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-4">
            {[
              { n: 1, t: "Podajesz datę i adres" },
              { n: 2, t: "Dopisujesz imię dziecka i krótkie wskazówki" },
              { n: 3, t: "Przyjeżdża miś (lub elfy, gdy miś zajęty)" },
              { n: 4, t: "Zabawa + wręczenie prezentu + zdjęcia" },
            ].map((s) => (
              <div
                key={s.n}
                className="rounded-2xl bg-slate-50 border border-slate-200 p-5 text-center"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white shadow ring-1 ring-black/5 font-extrabold">
                  {s.n}
                </div>
                <p className="mt-3 text-slate-700">{s.t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DLACZEGO HAPPYDATE */}
      <section className="py-16">
        <div className="container mx-auto max-w-5xl px-6">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 text-center">
            Dlaczego HappyDate?
          </h2>
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            {[
              {
                icon: "🧠",
                h: "Personalizacja AI",
                p: "Dopasujemy scenariusz do wieku i temperamentu dziecka — delikatnie i bez nachalnych żartów.",
              },
              {
                icon: "🕒",
                h: "Punktualność i dyskrecja",
                p: "Szanujemy plan dnia: krótkie okno czasowe, kontakt na żywo, podejście bez stresu.",
              },
              {
                icon: "🤝",
                h: "Gdy miś zajęty — przyjadą elfy",
                p: "Alternatywa bez utraty jakości: te same zasady, ten sam uśmiech.",
              },
              {
                icon: "🔒",
                h: "Bezpieczeństwo",
                p: "Zweryfikowani animatorzy, ubezpieczenie i dbałość o komfort malucha.",
              },
            ].map((f) => (
              <div key={f.h} className="flex items-start gap-4">
                <div className="text-xl">{f.icon}</div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">{f.h}</h3>
                  <p className="mt-1 text-slate-700">{f.p}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CENNIK */}
      <section id="pricing" className="py-16 bg-white">
        <div className="container mx-auto max-w-5xl px-6">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 text-center">
            Cennik
          </h2>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              {
                name: "Mini Miś",
                price: "199 zł",
                desc: "Krótka wizyta (ok. 10 minut): wręczenie prezentu + zdjęcia.",
                cta: "Wybieram",
              },
              {
                name: "Miś Classic",
                price: "279 zł",
                desc: "Wizyta 15–20 minut: mini-animacja, życzenia, zdjęcia/wideo.",
                cta: "Rezerwuję",
                popular: true,
              },
              {
                name: "Miś + Elfy",
                price: "349 zł",
                desc: "Wizyta rozszerzona: miś + jedna/dwie pomocne postacie.",
                cta: "Biorę pakiet",
              },
            ].map((p) => (
              <div
                key={p.name}
                className={`relative rounded-2xl border p-6 shadow-sm ${
                  p.popular
                    ? "bg-amber-50 border-amber-200"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 text-white text-xs px-3 py-1 shadow">
                    Najczęściej wybierany
                  </span>
                )}
                <h3 className="text-xl font-semibold text-slate-900">{p.name}</h3>
                <p className="mt-1 text-3xl font-extrabold text-slate-900">{p.price}</p>
                <p className="mt-2 text-slate-700">{p.desc}</p>
                <Link
                  href="/survey"
                  className="mt-5 inline-flex rounded-2xl bg-amber-400 px-4 py-2 font-semibold text-slate-900 shadow hover:bg-amber-500"
                >
                  {p.cta} →
                </Link>
              </div>
            ))}
          </div>

          <p className="mt-4 text-center text-sm text-slate-500">
            Ceny orientacyjne w granicach miasta. Dojazd poza miasto/okresy
            szczytu – według indywidualnej wyceny.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="container mx-auto max-w-4xl px-6">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 text-center">
            Najczęstsze pytania
          </h2>
          <div className="mt-8 space-y-4">
            {[
              {
                q: "Czy dziecko nie przestraszy się misia?",
                a: "Animator działa delikatnie: najpierw kontakt wzrokowy i przywitanie z dystansu. Jeśli dziecko potrzebuje więcej czasu, zwalniamy tempo.",
              },
              {
                q: "Czy możliwa jest personalizacja życzeń?",
                a: "Tak! Możemy dodać imię, krótką rymowankę, a nawet informację o ulubionej zabawce.",
              },
              {
                q: "Co jeśli miś będzie zajęty?",
                a: "Wyślemy elfy — to ta sama jakość wizyty i równie ciepła atmosfera.",
              },
              {
                q: "Jak rezerwować termin?",
                a: "Kliknij „Zamów wizytę misia”, podaj datę/adres i krótki opis. Potwierdzimy SMS-em lub mailem.",
              },
            ].map((f) => (
              <details
                key={f.q}
                className="group rounded-xl border border-slate-200 bg-white p-4 open:shadow-sm"
              >
                <summary className="cursor-pointer list-none font-semibold text-slate-900">
                  <span className="mr-2">❓</span>{f.q}
                </summary>
                <p className="mt-2 text-slate-700">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA końcowe */}
      <section className="py-16 bg-white">
        <div className="container mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">
            Zróbmy misiową niespodziankę! 🐻✨
          </h2>
          <p className="mt-3 text-slate-700">
            Podaj datę i kilka słów o dziecku — zajmiemy się resztą.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/survey"
              className="rounded-2xl px-6 py-3 font-semibold text-white shadow-lg ring-1 ring-black/5
                         bg-gradient-to-r from-[#ff4f8b] to-[#ff6e64] transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              Zamów wizytę 🎁
            </Link>
            <Link
              href="/services"
              className="rounded-2xl border bg-white px-6 py-3 font-semibold text-slate-900 hover:bg-slate-50"
            >
              Wróć do usług
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
