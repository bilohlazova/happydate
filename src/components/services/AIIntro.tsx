// src/components/services/AIIntro.tsx
"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import AskAIButton from "@/components/services/AskAIButton";
import BotQuoteBubble from "@/components/services/BotQuote";

export default function AIIntro() {
  const t = useTranslations("static.services.phase3b.assistant");
  const examples = ["e1", "e2", "e3", "e4"] as const;

  return (
    <section className="mx-auto max-w-5xl px-6 py-14">
      <h2 className="text-center text-2xl md:text-3xl font-extrabold text-slate-900">
        {t("introTitle")}
      </h2>
      <p className="mt-3 text-center text-slate-600">
        {t("introSubtitle")}
      </p>

      {/* layout: lewa kolumna — przykłady; prawa — robot + cytat */}
      <div className="mt-8 grid items-center gap-8 md:grid-cols-2">
        {/* Przykładowe pytania */}
        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            {examples.map((txt) => (
              <AskAIButton key={txt} variant="ghost">
                {t(`examples.${txt}`)}
              </AskAIButton>
            ))}
          </div>

          <p className="mt-4 text-sm text-neutral-500">
            {t("tip")}
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
            alt={t("botAlt")}
            width={420}
            height={420}
            className="w-full max-w-[360px] md:max-w-[420px] h-auto drop-shadow-xl"
            priority={false}
          />
          {/* бейдж online */}
          <span className="absolute bottom-3 right-3 rounded-full bg-white/80 backdrop-blur px-3 py-1 text-xs shadow ring-1 ring-black/5">
            HappyBot •{" "}
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />{" "}
              {t("online")}
            </span>
          </span>

          {/* цитата у хмарці */}
          <BotQuoteBubble />
        </div>
      </div>
    </section>
  );
}
