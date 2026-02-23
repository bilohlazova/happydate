// src/app/services/rok-radosci/plan/[slug]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

type Billing = "monthly" | "yearly";
type PlanKey = "planer" | "concierge";

const PLANS: Record<PlanKey, {
  name: string;
  tagline: string;
  monthly: string;
  yearly: string;
  includes: string[];
  bestFor: string[];
  faq: { q: string; a: string }[];
}> = {
  planer: {
    name: "Planer",
    tagline: "Przypomnienia i pomysły – bez angażowania doradcy.",
    monthly: "19 zł/mies.",
    yearly: "199 zł/rok",
    includes: [
      "Przypomnienia (mail/SMS) o ważnych datach",
      "Nielimitowane podpowiedzi AI (pomysły na prezenty)",
      "Checklisty zakupowe i linki do produktów",
      "1×/kwartał mini-konsultacja (e-mail)",
    ],
    bestFor: [
      "Osoby, które lubią działać samodzielnie",
      "Prostsze okazje i mniejsze budżety",
      "Szybkie, konkretne inspiracje",
    ],
    faq: [
      { q: "Czy mogę dodać wiele wydarzeń?", a: "Tak, możesz dodać dowolną liczbę wydarzeń do kalendarza i przypisać im budżet." },
      { q: "Czy AI przygotuje gotową listę zakupową?", a: "Tak, otrzymasz skróconą listę + linki do sprawdzonych sklepów." },
    ],
  },
  concierge: {
    name: "Concierge",
    tagline: "AI + doradca człowiek – pełne wsparcie do 12 wydarzeń rocznie.",
    monthly: "49 zł/mies.",
    yearly: "499 zł/rok",
    includes: [
      "Wszystko z planu Planer",
      "Kontakt z doradcą (chat/e-mail)",
      "Do 12 wydarzeń w roku (koordynacja i przypomnienia)",
      "Gotowe koszyki/linki zakupowe (np. Allegro, Empik)",
      "Dopasowanie do preferencji i stylu obdarowanego",
    ],
    bestFor: [
      "Zapracowanych i wymagające okazje",
      "Większe budżety i personalizacja",
      "Spokój: my koordynujemy, Ty zatwierdzasz",
    ],
    faq: [
      { q: "Jak kontaktuję się z doradcą?", a: "Bezpośrednio w panelu (chat) lub przez e-mail – w godzinach pracy." },
      { q: "Czy pomagacie w zamówieniu/dostawie?", a: "Tak, doradca przygotuje listę produktów i harmonogram, a Ty finalizujesz zakup lub zlecasz nam koordynację partnera." },
    ],
  },
};

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const key = (params.slug || "") as PlanKey;
  const plan = PLANS[key] ?? PLANS.planer;
  return {
    title: `HappyDate – ${plan.name} (Rok Radości)`,
    description: plan.tagline,
    alternates: { canonical: `/services/rok-radosci/plan/${key}` },
    openGraph: { title: plan.name, description: plan.tagline, type: "website" },
  };
}

export default function PlanPage({ params, searchParams }: { params: { slug: string }, searchParams?: { billing?: Billing } }) {
  const key = (params.slug as PlanKey) in PLANS ? (params.slug as PlanKey) : "planer";
  const plan = PLANS[key];
  const billing: Billing = (searchParams?.billing === "yearly" ? "yearly" : "monthly");

  return (
    <main className="bg-white dark:bg-gray-900">
      {/* HERO */}
      <section className="bg-gradient-to-b from-rose-50 to-cyan-50 py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1 text-sm font-semibold text-pink-700 shadow-sm">
            Rok Radości • {plan.name}
          </div>
          <h1 className="mt-4 text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white">
            {plan.name} – {plan.tagline}
          </h1>
          <p className="mt-3 text-slate-700 dark:text-slate-300">
            Pełny opis zakresu, korzyści i możliwości. Wybierz rozliczanie i rozpocznij.
          </p>

          {/* toggle billing */}
          <div className="mt-6 flex items-center justify-center gap-4">
            <span className={billing === "monthly" ? "font-bold" : ""}>Miesięcznie</span>
            <Link
              href={`?billing=${billing === "monthly" ? "yearly" : "monthly"}`}
              scroll={false}
              className="relative inline-flex h-6 w-12 items-center rounded-full bg-pink-500"
            >
              <span
                className={`${billing === "yearly" ? "translate-x-6" : "translate-x-1"} inline-block h-4 w-4 transform rounded-full bg-white transition`}
              />
            </Link>
            <span className={billing === "yearly" ? "font-bold" : ""}>Rocznie (2 mies. gratis)</span>
          </div>

          <div className="mt-4 text-3xl font-extrabold text-pink-600">
            {billing === "monthly" ? plan.monthly : plan.yearly}
          </div>
        </div>
      </section>

      {/* CO W CENIE */}
      <section className="py-14">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-800 p-6 shadow">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Co dokładnie w cenie?</h2>
            <ul className="mt-4 space-y-3 text-slate-700 dark:text-slate-300">
              {plan.includes.map((item, i) => (
                <li key={i}>✔ {item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-800 p-6 shadow">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Dla kogo?</h2>
            <ul className="mt-4 space-y-3 text-slate-700 dark:text-slate-300">
              {plan.bestFor.map((item, i) => (
                <li key={i}>👉 {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-6">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-xl font-bold text-slate-900 dark:text-white">FAQ – Najczęstsze pytania</h2>
          <div className="mt-6 divide-y divide-slate-200 dark:divide-slate-700 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            {plan.faq.map((f, i) => (
              <details key={i} className="px-5 py-4">
                <summary className="cursor-pointer select-none text-slate-900 dark:text-white font-medium">
                  {f.q}
                </summary>
                <p className="mt-3 text-slate-700 dark:text-slate-300">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA – оформлення підписки */}
      <section className="pb-20 pt-8">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="text-slate-700 dark:text-slate-300">
            Gotowa/y? Wybierz rozliczanie i rozpocznij subskrypcję. Zawsze możesz zrezygnować w 14 dni.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href={`/checkout?plan=${key}&billing=${billing}`}
              className="rounded-2xl bg-pink-600 px-6 py-3 font-semibold text-white shadow-lg hover:bg-pink-700"
            >
              Rozpocznij subskrypcję
            </Link>
            <Link
              href="/services/rok-radosci"
              className="rounded-2xl bg-white px-6 py-3 font-semibold text-slate-900 shadow hover:bg-slate-50 dark:bg-slate-800 dark:text-white"
            >
              Wróć do planów
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
