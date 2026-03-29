"use client";

import Link from "next/link";

type PlanType = "list_cyfrowy" | "list_drukowany" | "video_cyfrowe" | "video_premium";

type Plan = {
  name: string; price: string; description: string;
  features: string[]; highlighted?: boolean; tag?: string;
  type: PlanType; slug: string;
};

const plans: Plan[] = [
  {
    name: "List cyfrowy", price: "99 zł", type: "list_cyfrowy", slug: "list-cyfrowy",
    description: "Dostawa e-mailem lub SMS-em w wybranym dniu.",
    features: ["Bezpieczne przechowywanie 12 miesięcy", "Dostawa cyfrowa (mail/SMS)", "Możliwość przedłużenia (9 zł/rok)"],
  },
  {
    name: "List drukowany", price: "179 zł", type: "list_drukowany", slug: "list-drukowany",
    description: "Elegancki druk na papierze premium, koperta i dostawa kurierem.",
    features: ["Przechowywanie 12 miesięcy", "Druk premium + koperta kremowa", "Dostawa kurierem", "Kopia cyfrowa w cenie"],
  },
  {
    name: "Wideo cyfrowe", price: "199 zł", type: "video_cyfrowe", slug: "wideo-cyfrowe",
    description: "Nagranie do 10 min dostarczone bezpiecznym linkiem.",
    features: ["Przechowywanie 12 miesięcy", "Bezpieczny link do odtworzenia", "Powiadomienie odbiorcy w dniu wysyłki"],
    highlighted: true, tag: "Najczęściej wybierany",
  },
  {
    name: "Wideo premium", price: "299 zł", type: "video_premium", slug: "wideo-premium",
    description: "Pendrive w pudełku prezentowym + kopia cyfrowa i dostawa kurierem.",
    features: ["Przechowywanie 12 miesięcy", "Pendrive 16 GB + pudełko", "Kopia cyfrowa", "Dostawa kurierem"],
  },
];

export default function PricingWiadomosc() {
  return (
    <section id="pricing" className="relative py-16 bg-gradient-to-b from-[#f0f9ff] to-[#f8faff]">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Pakiety i ceny</h2>
        <p className="mt-3 text-lg text-slate-500">
          Każdy pakiet obejmuje <span className="font-semibold text-sky-600">12 miesięcy</span> przechowywania.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {plans.map(plan => (
            <article
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:shadow-md ${
                plan.highlighted ? "border-sky-400 ring-2 ring-sky-300" : "border-sky-100"
              }`}
            >
              {plan.tag && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-sky-500 to-blue-500 px-3 py-0.5 text-xs font-bold text-white shadow">
                  {plan.tag}
                </span>
              )}

              <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{plan.description}</p>

              <div className="mt-4 inline-flex items-baseline gap-1 rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 px-3 py-1 text-white shadow self-start">
                <span className="text-2xl font-extrabold">{plan.price}</span>
              </div>

              <ul className="mt-4 space-y-1.5 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="text-sky-500 mt-0.5 flex-shrink-0">✓</span> {f}
                  </li>
                ))}
              </ul>

              <Link
                href={`/services/wiadomosc-z-nieba/plans/${plan.slug}`}
                className={`mt-5 block w-full rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-sky-200 ${
                  plan.highlighted
                    ? "bg-gradient-to-r from-sky-500 to-blue-500 text-white hover:brightness-110"
                    : "bg-sky-50 text-sky-700 ring-1 ring-sky-200 hover:bg-sky-100"
                }`}
              >
                Szczegóły i zamów
              </Link>
            </article>
          ))}
        </div>

        {/* Юридична примітка */}
        <p className="mt-8 text-xs text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Ceny brutto. Usługa ma charakter spersonalizowany — po rozpoczęciu realizacji prawo odstąpienia nie przysługuje (art. 38 pkt 3 ustawy o prawach konsumenta). Przedłużenie przechowywania: 9 zł/rok za każdy kolejny rok.
        </p>
      </div>
    </section>
  );
}