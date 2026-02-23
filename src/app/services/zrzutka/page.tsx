// src/app/services/zrzutka/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "HappyDate – Zrzutka na Prezent",
  description:
    "Udostępnij link, zaproś znajomych i zbieraj środki na wyjątkowy upominek. My zajmiemy się resztą: koordynacją, zakupem i dostawą.",
  alternates: { canonical: "/services/zrzutka" },
  openGraph: {
    title: "HappyDate – Zrzutka na Prezent",
    description:
      "Wspólny prezent bez chaosu: jeden link, przejrzyste postępy i prezent dostarczony na czas.",
    type: "website",
    url: "https://happydate.pl/services/zrzutka",
  },
  twitter: { card: "summary_large_image" },
};

export default function ZrzutkaPage() {
  return (
    <main className="overflow-x-hidden">
      {/* HERO */}
      <section className="relative bg-gradient-to-br from-sky-50 via-rose-50 to-amber-50">
        <div className="container mx-auto max-w-6xl px-4 py-20 md:py-24">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
                🤝 Zrzutka na Prezent
              </h1>
              <p className="mt-4 text-lg text-slate-700">
                Udostępnij link, zaproś znajomych i zbieraj środki na wyjątkowy
                upominek. My zajmiemy się wszystkim — od rekomendacji po zakup i
                dostawę z efektem „wow”.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="#start"
                  className="rounded-2xl bg-gradient-to-r from-fuchsia-500 to-pink-500 px-6 py-3 font-semibold text-white shadow ring-1 ring-black/5 hover:from-fuchsia-600 hover:to-pink-600"
                >
                  Rozpocznij zrzutkę →
                </Link>
                <Link
                  href="/services"
                  className="rounded-2xl border border-slate-200 bg-white px-6 py-3 font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Zobacz inne usługi
                </Link>
              </div>

              <ul className="mt-6 grid gap-2 text-sm text-slate-600">
                {[
                  "Przejrzysty link do wpłat i udostępniania",
                  "Status zrzutki i przypomnienia o terminie",
                  "Pomysły AI i konsultant dla finalizacji",
                ].map((li) => (
                  <li key={li} className="flex items-start gap-2">
                    <span className="mt-0.5">✅</span>
                    <span>{li}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-3xl border border-white/70 bg-white shadow-xl ring-1 ring-black/5">
                <Image
                  src="/images/gifts/zrzutka.jpg"
                  alt="Wspólny prezent – zbiórka ze znajomymi"
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width:768px) 90vw, 40vw"
                />
              </div>
              <div className="pointer-events-none absolute inset-0 -z-10 translate-x-6 translate-y-6 rounded-[2rem] bg-white/60 blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Jak to działa */}
      <section id="start" className="py-16 md:py-20">
        <div className="container mx-auto max-w-5xl px-4">
          <h2 className="mb-10 text-center text-3xl font-extrabold text-slate-900 md:text-4xl">
            Jak to działa?
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                n: 1,
                h: "Utwórz zrzutkę",
                p: "Określ okazję, termin i budżet. Otrzymasz link do wpłat i stronę z informacjami.",
              },
              {
                n: 2,
                h: "Udostępnij link",
                p: "Wyślij znajomym przez WhatsApp, Messenger czy e-mail. Każda wpłata jest zliczana.",
              },
              {
                n: 3,
                h: "Finalizacja prezentu",
                p: "Gdy kwota jest zebrana — doradzimy i zorganizujemy zakup, pakowanie i dostawę.",
              },
            ].map((s) => (
              <article
                key={s.n}
                className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5"
              >
                <div className="mb-2 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sky-700 ring-1 ring-sky-200">
                    {s.n}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">{s.h}</h3>
                </div>
                <p className="text-slate-700">{s.p}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/survey?flow=zrzutka"
              className="inline-flex items-center rounded-2xl bg-amber-400 px-6 py-3 font-semibold text-slate-900 shadow hover:bg-amber-500"
            >
              Zacznij od krótkiej ankiety →
            </Link>
          </div>
        </div>
      </section>

      {/* Dlaczego z HappyDate */}
      <section className="bg-gradient-to-r from-sky-50 to-cyan-50 py-16 md:py-20">
        <div className="container mx-auto max-w-5xl px-4">
          <h2 className="mb-10 text-center text-3xl font-extrabold text-slate-900 md:text-4xl">
            Dlaczego z HappyDate?
          </h2>
          <div className="grid gap-8 md:grid-cols-2">
            {[
              {
                t: "Zero chaosu organizacyjnego",
                d: "Jeden link, jasny cel i termin. Wszyscy wiedzą, ile brakuje i co planujemy kupić.",
              },
              {
                t: "Pomysły AI + konsultant",
                d: "Połączymy sztuczną inteligencję z ludzkim doświadczeniem, by dopasować prezent do osoby i okazji.",
              },
              {
                t: "Transparentność",
                d: "Każda wpłata ma potwierdzenie, a postęp zrzutki jest widoczny dla organizatora.",
              },
              {
                t: "Pakowanie i dostawa",
                d: "Zadbamy o pudełko, kartkę, liścik i punktualną dostawę — również dyskretną.",
              },
            ].map((f) => (
              <div key={f.t} className="flex items-start gap-3">
                <span className="mt-1">🎁</span>
                <div>
                  <p className="font-semibold text-slate-900">{f.t}</p>
                  <p className="text-slate-700">{f.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pakiety / Cennik (przykładowo) */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto max-w-6xl px-4">
          <h2 className="mb-10 text-center text-3xl font-extrabold text-slate-900 md:text-4xl">
            Pakiety organizacyjne
          </h2>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                name: "Starter",
                price: "0 zł",
                note: "organizacja samodzielna, link do zrzutki",
                bullets: ["Link i strona zrzutki", "Podstawowe szablony udostępniania"],
              },
              {
                name: "Concierge",
                price: "49 zł",
                note: "pomoc konsultanta przy finalizacji",
                bullets: [
                  "Pomysły AI + konsultant",
                  "Lista rekomendowanych prezentów",
                  "Wsparcie przy zamówieniu i dostawie",
                ],
              },
              {
                name: "Premium",
                price: "od 199 zł",
                note: "pełna koordynacja i personalizacja",
                bullets: [
                  "Kompletna obsługa prezentu",
                  "Pakowanie, kartka i liścik",
                  "Dostawa w terminie + foto potwierdzenie",
                ],
              },
            ].map((p, i) => (
              <article
                key={p.name}
                className={`rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 ${
                  i === 1 ? "border-2 border-pink-400" : ""
                }`}
              >
                <h3 className="text-xl font-bold text-slate-900">{p.name}</h3>
                <p className="mt-1 text-3xl font-extrabold text-slate-900">{p.price}</p>
                <p className="text-sm text-slate-600">{p.note}</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <span className="mt-0.5">✅</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <Link
                    href="/survey?flow=zrzutka"
                    className="inline-flex rounded-2xl bg-sky-600 px-5 py-2.5 font-semibold text-white shadow hover:bg-sky-700"
                  >
                    Wybierz pakiet
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-16 md:py-20">
        <div className="container mx-auto max-w-5xl px-4">
          <h2 className="mb-8 text-center text-3xl font-extrabold text-slate-900 md:text-4xl">
            Najczęstsze pytania
          </h2>
          <div className="space-y-6">
            {[
              {
                q: "Czy uczestnicy widzą kwoty wpłat?",
                a: "Domyślnie tylko organizator widzi pełne kwoty; możesz włączyć uproszczony widok postępu dla wszystkich.",
              },
              {
                q: "Jak długo trwa zrzutka?",
                a: "Ustawiasz termin końcowy — przypominamy delikatnie uczestnikom i Tobie, gdy zbliża się deadline.",
              },
              {
                q: "Czy mogę zmienić prezent po drodze?",
                a: "Tak. Możesz edytować cel i listę pomysłów. Doradzimy, co będzie najlepsze w budżecie.",
              },
              {
                q: "Jak wygląda dostawa?",
                a: "Po zebraniu środków zamawiamy, pakujemy i dostarczamy w wybranym dniu — nawet dyskretnie.",
              },
            ].map((f) => (
              <details key={f.q} className="group rounded-2xl border bg-white p-4 open:shadow-sm">
                <summary className="cursor-pointer select-none text-slate-900 marker:content-['']">
                  <span className="inline-block font-semibold">{f.q}</span>
                </summary>
                <p className="mt-2 text-slate-700">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA końcowe */}
      <section className="bg-gradient-to-r from-fuchsia-50 via-rose-50 to-amber-50 py-16 md:py-20">
        <div className="container mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-extrabold text-slate-900 md:text-4xl">
            Zorganizuj wspólny prezent — bez chaosu
          </h2>
          <p className="mt-3 text-lg text-slate-700">
            Jeden link, pełna koordynacja i efekt „wow” w dniu wydarzenia.
          </p>
          <div className="mt-7">
            <Link
              href="/survey?flow=zrzutka"
              className="inline-flex items-center rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-600 px-7 py-3 font-semibold text-white shadow ring-1 ring-black/5 hover:from-sky-700 hover:to-cyan-700"
            >
              Start →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
