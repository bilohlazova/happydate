"use client";

import Link from "next/link";

type PlanType = "list_cyfrowy" | "list_drukowany" | "video_cyfrowe" | "video_premium";

type Plan = {
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  tag?: string;
  type: PlanType;
  slug: string; // URL częściowy
};

const plans: Plan[] = [
  {
    name: "List cyfrowy",
    price: "99 zł",
    description:
      "Prześlij nam treść listu, a my dostarczymy go e-mailem lub SMS-em w wybranym dniu.",
    features: [
      "Bezpieczne przechowywanie 12 miesięcy",
      "Dostawa cyfrowa (mail/SMS)",
      "Możliwość przedłużenia przechowywania",
    ],
    type: "list_cyfrowy",
    slug: "list-cyfrowy",
  },
  {
    name: "List drukowany",
    price: "179 zł",
    description:
      "Twój list wydrukujemy na eleganckim papierze, zapakujemy i dostarczymy kurierem.",
    features: [
      "Przechowywanie 12 miesięcy",
      "Druk premium + koperta",
      "Dostawa kurierem",
      "Kopia cyfrowa w cenie",
    ],
    type: "list_drukowany",
    slug: "list-drukowany",
  },
  {
    name: "Wideo cyfrowe",
    price: "199 zł",
    description:
      "Prześlij swoje nagranie (do 10 min), a my przechowamy je i wyślemy w odpowiednim dniu.",
    features: [
      "Przechowywanie 12 miesięcy",
      "Bezpieczne linki do wideo",
      "Powiadomienie odbiorcy w dniu wysyłki",
    ],
    highlighted: true,
    tag: "Najczęściej wybierany",
    type: "video_cyfrowe",
    slug: "wideo-cyfrowe",
  },
  {
    name: "Wideo premium",
    price: "299 zł",
    description:
      "Zapis na pendrive i dostawa w eleganckim pudełku + kopia cyfrowa.",
    features: [
      "Przechowywanie 12 miesięcy",
      "Pendrive + pudełko prezentowe",
      "Kopia cyfrowa w cenie",
      "Dostawa kurierem",
    ],
    type: "video_premium",
    slug: "wideo-premium",
  },
];

export default function PricingWiadomosc() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="relative py-20 bg-gradient-to-b from-[#fafcff] via-[#f7f6ff] to-[#fff7fb]"
    >
      {/* pastel blobs */}
      <span className="pointer-events-none absolute -left-10 top-24 h-56 w-56 rounded-full bg-pink-200/30 blur-3xl" />
      <span className="pointer-events-none absolute -right-12 top-48 h-64 w-64 rounded-full bg-sky-200/35 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-6xl px-6 text-center">
        <h2
          id="pricing-heading"
          className="text-3xl md:text-4xl font-bold text-slate-900"
        >
          Pakiety i ceny
        </h2>
        <p className="mt-4 text-lg text-slate-600">
          Wybierz formę wiadomości, a my zajmiemy się resztą. Każdy pakiet
          obejmuje{" "}
          <span className="font-semibold text-pink-600">
            12 miesięcy
          </span>{" "}
          przechowywania.
        </p>

        <div
          className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4"
          role="list"
          aria-label="Lista dostępnych pakietów"
        >
          {plans.map((plan) => (
            <article
              key={plan.name}
              role="listitem"
              aria-labelledby={`plan-${slug(plan.name)}-title`}
              className="group relative flex flex-col rounded-2xl p-[1px]"
            >
              {/* gradient border tylko dla highlighted */}
              {plan.highlighted && (
                <span
                  aria-hidden
                  className="absolute inset-0 -z-10 rounded-2xl bg-[conic-gradient(at_30%_-10%,#ff7ab3aa,transparent_40%,#7aa8ffaa_70%,#ffffff66)] opacity-80 blur-[2px]"
                />
              )}

              <div className="flex h-full flex-col rounded-2xl border border-white/70 bg-white/70 p-6 text-left shadow-[0_16px_50px_-20px_rgba(0,0,0,.15)] backdrop-blur-lg transition group-hover:shadow-[0_18px_56px_-18px_rgba(0,0,0,.18)]">
                {plan.tag && (
                  <div className="mb-3">
                    <span className="inline-flex items-center rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500 px-3 py-1 text-xs font-semibold text-white shadow">
                      {plan.tag}
                    </span>
                  </div>
                )}

                <header>
                  <h3
                    id={`plan-${slug(plan.name)}-title`}
                    className="text-xl font-bold text-slate-900"
                  >
                    {plan.name}
                  </h3>
                  <p className="mt-2 text-slate-600">{plan.description}</p>
                  <div
                    className="mt-4 inline-flex items-baseline gap-1 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-500 px-3 py-1 text-white shadow"
                    aria-label={`Cena: ${plan.price}`}
                  >
                    <span className="text-2xl font-extrabold">
                      {plan.price}
                    </span>
                  </div>
                </header>

                <ul className="mt-4 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start text-slate-700">
                      <span aria-hidden="true" className="mr-2 text-pink-500">
                        ✓
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-6">
                  <Link
                    href={`/services/wiadomosc-z-nieba/plans/${plan.slug}`}
                    aria-label={`Szczegóły: ${plan.name}`}
                    className={`block w-full rounded-xl px-4 py-3 text-center font-semibold transition focus:outline-none focus:ring-4 focus:ring-pink-300 ${
                      plan.highlighted
                        ? "bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white hover:brightness-110"
                        : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Szczegóły i zamów
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function slug(s: string) {
  return s.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
}
