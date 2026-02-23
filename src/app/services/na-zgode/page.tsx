// src/app/services/na-zgode/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "HappyDate – Prezent na Zgodę",
  description:
    "Drobny gest mówi więcej niż tysiąc słów. Pomożemy powiedzieć „przepraszam” – elegancko, dyskretnie i na czas.",
  alternates: { canonical: "/services/na-zgode" },
  openGraph: {
    title: "HappyDate – Prezent na Zgodę",
    description:
      "Zrobimy to za Ciebie: kwiaty, liścik, mały upominek, a nawet dostawa z krótką wiadomością audio.",
    type: "website",
    url: "https://happydate.pl/services/na-zgode",
  },
  twitter: { card: "summary_large_image" },
};

export default function PrezentNaZgodePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-r from-rose-50 via-amber-50 to-sky-50">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-rose-200/40 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
        </div>

        <div className="mx-auto max-w-6xl px-4 py-20 text-center md:py-24">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
            💌 Prezent na Zgodę
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-700 md:text-xl">
            Czasem trudno znaleźć słowa. My pomożemy je „spakować” w gest:
            delikatny, piękny i z efektem „wow”.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/survey?flow=na-zgode"
              className="rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 px-6 py-3 font-semibold text-white shadow ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-lg"
              aria-label="Zacznij — wypełnij krótką ankietę"
            >
              Zacznij teraz ✨
            </Link>
            <a
              href="https://wa.me/48123456789"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border border-amber-300 bg-amber-50 px-6 py-3 font-semibold text-amber-800 transition hover:bg-amber-100"
              aria-label="Napisz na WhatsApp"
            >
              Napisz na WhatsApp 💬
            </a>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-[-32px] h-16 rounded-t-[32px] bg-white" />
      </section>

      {/* Dlaczego to działa */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-8 text-center text-3xl font-extrabold text-slate-900 md:text-4xl">
            Dlaczego „Prezent na Zgodę” działa? 💭
          </h2>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: "🌷",
                title: "Gest > słowa",
                text: "Drobny upominek łagodzi emocje i otwiera drzwi do rozmowy.",
              },
              {
                icon: "✍️",
                title: "Osobisty liścik",
                text: "Napiszemy z Tobą krótką, szczerą wiadomość — bez patosu.",
              },
              {
                icon: "⏱️",
                title: "Szybko i dyskretnie",
                text: "Ekspresowa organizacja, możliwość dostawy pod drzwi i bez kontaktu bezpośredniego.",
              },
            ].map((c) => (
              <article
                key={c.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="text-3xl">{c.icon}</div>
                <h3 className="mt-3 text-xl font-semibold text-slate-900">
                  {c.title}
                </h3>
                <p className="mt-1 text-slate-600">{c.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Co przygotujemy */}
      <section className="bg-gradient-to-b from-white to-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-8 text-center text-3xl font-extrabold text-slate-900 md:text-4xl">
            Co możemy przygotować? 🎁
          </h2>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Kwiaty + liścik",
                text: "Klasyka w eleganckim wydaniu. Dobierzemy kolorystykę i ton wiadomości.",
                badge: "Najczęściej wybierane",
              },
              {
                title: "Słodki zestaw „przepraszam”",
                text: "Czekoladki/pyszne słodycze + mini-upominek (świeca, herbaty) w pudełku.",
                badge: "Delikatny gest",
              },
              {
                title: "Voucher / drobny prezent",
                text: "Mały, ale przemyślany — np. voucher na kawę we dwoje lub masaż.",
                badge: "Subtelna opcja",
              },
            ].map((i) => (
              <article
                key={i.title}
                className="rounded-2xl border border-white/60 bg-white/90 p-6 shadow-sm ring-1 ring-slate-200"
              >
                <span className="inline-block rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 ring-1 ring-sky-200">
                  {i.badge}
                </span>
                <h3 className="mt-3 text-xl font-semibold text-slate-900">
                  {i.title}
                </h3>
                <p className="mt-1 text-slate-600">{i.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Jak to działa */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-8 text-center text-3xl font-extrabold text-slate-900 md:text-4xl">
            Jak to działa? 🪄
          </h2>

          <ol className="mx-auto grid max-w-4xl list-decimal gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-3 md:list-none">
            {[
              {
                n: "1",
                t: "Krótka ankieta lub czat",
                d: "Napisz, co się stało i jaka jest relacja. Dyskretnie, bez ocen.",
              },
              {
                n: "2",
                t: "Dobór zestawu + liścik",
                d: "Proponujemy 2–3 opcje i układamy wiadomość tak, by brzmiała naturalnie.",
              },
              {
                n: "3",
                t: "Dostawa / przekazanie",
                d: "Ustalamy termin i formę (także „pod drzwi”). Możliwa notatka audio.",
              },
            ].map((s) => (
              <li key={s.t} className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">{s.n}</div>
                <div className="text-lg font-semibold text-slate-900">{s.t}</div>
                <p className="text-slate-600">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Cennik — widełki, bo to usługa personalizowana */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-8 text-center text-3xl font-extrabold text-slate-900 md:text-4xl">
            Cennik orientacyjny 💳
          </h2>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                name: "Mini Gest",
                price: "od 79 zł",
                items: ["Kwiaty lub słodycze", "Liścik „przepraszam”", "Konsultacja 1:1 (krótka)"],
                accent: "border-sky-300",
              },
              {
                name: "Zestaw Klasyczny",
                price: "od 149 zł",
                items: ["Kwiaty + mały upominek", "Eleganckie opakowanie", "Personalizacja wiadomości"],
                accent: "border-rose-300",
              },
              {
                name: "Premium",
                price: "od 299 zł",
                items: ["Box prezentowy + voucher", "Możliwa notatka audio", "Koordynacja dostawy na konkretną godzinę"],
                accent: "border-amber-300",
              },
            ].map((p) => (
              <article
                key={p.name}
                className={`rounded-2xl border ${p.accent} bg-white p-6 shadow-sm ring-1 ring-slate-100`}
              >
                <h3 className="text-xl font-semibold text-slate-900">{p.name}</h3>
                <p className="mt-1 text-2xl font-extrabold text-slate-900">{p.price}</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-700">
                  {p.items.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                <Link
                  href="/survey?flow=na-zgode"
                  className="mt-5 inline-block rounded-xl bg-sky-600 px-4 py-2 font-semibold text-white shadow hover:bg-sky-700"
                >
                  Zamów w tym wariancie →
                </Link>
              </article>
            ))}
          </div>

          <p className="mt-4 text-center text-sm text-slate-500">
            * Ceny zależą od miasta i dostępności. Po ankiecie podamy dokładną wycenę i termin.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="mb-8 text-center text-3xl font-extrabold text-slate-900 md:text-4xl">
            Najczęstsze pytania ❓
          </h2>

          <div className="space-y-4">
            {[
              {
                q: "Czy mogę zamówić anonimowo?",
                a: "Tak. Możemy podpisać liścik tylko inicjałami albo w ogóle bez podpisu. Dane pozostają u nas bezpieczne.",
              },
              {
                q: "A co, jeśli osoba jest daleko?",
                a: "Zorganizujemy dostawę kurierską lub kwiatową. Dobierzemy elementy, które bezpiecznie dojadą.",
              },
              {
                q: "Czy pomagacie napisać wiadomość?",
                a: "Tak. Podasz kontekst, a my ułożymy krótki, empatyczny tekst — do akceptacji.",
              },
              {
                q: "Jak szybko to zrobicie?",
                a: "Często w 24–48 h. Przy ekspresie skontaktuj się przez WhatsApp — sprawdzimy możliwości w Twoim mieście.",
              },
            ].map((f) => (
              <details
                key={f.q}
                className="rounded-2xl border border-slate-200 bg-white p-4 open:shadow-sm"
              >
                <summary className="cursor-pointer select-none text-lg font-semibold text-slate-900">
                  {f.q}
                </summary>
                <p className="mt-2 text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA końcowe */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-extrabold text-slate-900 md:text-4xl">
            Zrób pierwszy krok — my pomożemy z resztą
          </h2>
          <p className="mt-3 text-slate-600">
            Wypełnij krótką ankietę i wybierz jeden z gotowych wariantów albo
            zleć nam pełną personalizację.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/survey?flow=na-zgode"
              className="rounded-2xl bg-gradient-to-r from-fuchsia-500 to-pink-500 px-6 py-3 font-semibold text-white shadow ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              Wypełnij ankietę →
            </Link>
            <a
              href="tel:+48123456789"
              className="rounded-2xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-800 hover:bg-slate-50"
            >
              Zadzwoń 📞
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
