// src/app/services/asystent-ai/page.tsx
import type { Metadata } from "next";

import AIIntro from "@/components/services/AIIntro";
import AIFAQ from "@/components/services/AIFAQ";
import AIHowItWorks from "@/components/services/AIHowItWorks";
import ChatModalControllerAI from "@/components/services/ChatModalControllerAI";
import AskAIButton from "@/components/services/AskAIButton";

export const metadata: Metadata = {
  title: "HappyDate – Asystent Prezentowy AI",
  description:
    "Twój osobisty asystent AI, który podpowie trafione prezenty na każdą okazję – na podstawie zainteresowań, relacji i budżetu.",
  alternates: { canonical: "/services/asystent-ai" },
  openGraph: {
    title: "HappyDate – Asystent Prezentowy AI",
    description:
      "Nie wiesz, co podarować? Zapytaj AI i otrzymaj 2–3 dopasowane propozycje w minutę.",
    type: "website",
    url: "https://happydate.pl/services/asystent-ai",
  },
  twitter: { card: "summary_large_image" },
};

export default function AsystentAIPage() {
  const features = [
    { emoji: "⚡", title: "Szybkie rekomendacje", text: "2–3 pomysły w minutę, z opisem i linkami do zakupu." },
    { emoji: "🎯", title: "Dopasowanie", text: "Preferencje, styl życia, wiek, okazja i budżet — wszystko brane pod uwagę." },
    { emoji: "🛡️", title: "Prywatność", text: "Twoje dane są bezpieczne. Możesz działać całkiem anonimowo." },
    { emoji: "🤝", title: "Wsparcie człowieka", text: "Gdy potrzeba — dołącza konsultant i dopina całość z dostawą." },
  ] as const;

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-rose-50 to-amber-50">
      {/* 1) Poznaj swojego doradcę */}
      <AIIntro />

      {/* 2) Korzyści */}
      <section className="mx-auto max-w-5xl px-6 py-14">
        <h2 className="text-center text-2xl md:text-3xl font-extrabold text-slate-900">
          Dlaczego HappyDate?
        </h2>
        <p className="mt-3 text-center text-slate-600">
          Zobacz, dlaczego użytkownicy wybierają nasz Asystent Prezentowy.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {features.map((f) => (
            <article
              key={f.title}
              className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5"
            >
              <div className="text-2xl">{f.emoji}</div>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">
                {f.title}
              </h3>
              <p className="mt-1 text-slate-600">{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* 3) Jak działa Asystent? */}
      <AIHowItWorks />

      {/* 4) Dolny CTA */}
      <section className="mx-auto max-w-4xl px-6 pb-12">
        <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-black/5 text-center">
          <h2 className="text-xl font-bold text-slate-900">
            Gotowy na pomysł idealnego prezentu?
          </h2>
          <p className="mt-2 text-slate-600">
            Uruchom czat i w 60 sekund dostaniesz 2–3 trafione propozycje.
          </p>
          <div className="mt-4">
            <AskAIButton />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Anonimowo i bez zobowiązań
          </p>
        </div>
      </section>

      {/* 5) FAQ */}
      <AIFAQ />

      {/* Kontroler modalki */}
      <ChatModalControllerAI />
    </main>
  );
}
