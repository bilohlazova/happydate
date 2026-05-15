// src/components/services/AIIntro.tsx
"use client";

import Image from "next/image";
import AskAIButton from "@/components/services/AskAIButton";
import BotQuoteBubble from "@/components/services/BotQuote";

export default function AIIntro() {
  const examples = [
    "👔 Pomysł na prezent dla taty (do 150 zł, majsterkowanie)",
    "💍 Elegancki upominek ślubny (300–500 zł)",
    "🌸 Upominek dla babci (do 80 zł, lubi ogród)",
    "💡 Tani, ale wyjątkowy prezent dla kolegi (do 60 zł, kawa)",
  ];

  return (
    <section className="mx-auto max-w-5xl px-6 py-14">
      <h2 className="text-center text-2xl md:text-3xl font-extrabold text-slate-900">
        Poznaj swojego doradcę prezentowego
      </h2>
      <p className="mt-3 text-center text-slate-600">
        Wpisz pytanie lub kliknij przykład:
      </p>

      {/* layout: lewa kolumna — przykłady; prawa — robot + cytat */}
      <div className="mt-8 grid items-center gap-8 md:grid-cols-2">
        {/* Przykładowe pytania */}
        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            {examples.map((txt) => (
              <AskAIButton key={txt} variant="ghost" title="Otwórz czat AI">
                {txt}
              </AskAIButton>
            ))}
          </div>

          <p className="mt-4 text-sm text-neutral-500">
            Wskazówka: im więcej szczegółów (wiek, hobby, relacja, budżet),
            tym lepsze dopasowanie.
          </p>
        </div>

        {/* Ilustracja robota + cytat */}
        <div className="relative flex flex-col items-center gap-4">
          {/* mięке підсвічування */}
          <div
            aria-hidden
            className="absolute -inset-8 -z-10 rounded-full blur-2xl bg-gradient-to-tr from-sky-100 via-rose-100 to-amber-100"
          />
          <Image
            src="/images/robot.png"
            alt="HappyDate — asystent AI"
            width={420}
            height={420}
            className="w-full max-w-[360px] md:max-w-[420px] h-auto drop-shadow-xl"
            priority={false}
          />
          {/* бейдж online */}
          <span className="absolute bottom-3 right-3 rounded-full bg-white/80 backdrop-blur px-3 py-1 text-xs shadow ring-1 ring-black/5">
            HappyBot •{" "}
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> online
            </span>
          </span>

          {/* цитата у хмарці */}
          <BotQuoteBubble />
        </div>
      </div>
    </section>
  );
}
