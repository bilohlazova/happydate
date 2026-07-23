// src/app/services/asystent-ai/page.tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import AIIntro from "@/components/services/AIIntro";
import AIFAQ from "@/components/services/AIFAQ";
import AIHowItWorks from "@/components/services/AIHowItWorks";
import ChatModalControllerAI from "@/components/services/ChatModalControllerAI";
import AskAIButton from "@/components/services/AskAIButton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("static.services.phase3b.assistant");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: "/services/asystent-ai" },
    openGraph: {
      title: t("metaTitle"),
      description: t("ogDescription"),
      type: "website",
      url: "https://happydate.pl/services/asystent-ai",
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function AsystentAIPage() {
  const t = await getTranslations("static.services.phase3b.assistant");
  const features = [
    { emoji: "⚡", key: "speed" },
    { emoji: "🎯", key: "match" },
    { emoji: "🛡️", key: "privacy" },
    { emoji: "🤝", key: "human" },
  ] as const;

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-rose-50 to-amber-50 pb-[calc(var(--hd-nav-height)+env(safe-area-inset-bottom))]">
      {/* 1) Poznaj swojego doradcę */}
      <AIIntro />

      {/* 2) Korzyści */}
      <section className="mx-auto max-w-[var(--hd-screen-wide)] px-4 py-10 sm:px-5">
        <h2 className="text-center text-2xl md:text-3xl font-extrabold text-slate-900">
          {t("featuresTitle")}
        </h2>
        <p className="mt-3 text-center text-slate-600">
          {t("featuresSubtitle")}
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {features.map((f) => (
            <article
              key={f.key}
              className="hd-surface p-4"
            >
              <div className="text-2xl">{f.emoji}</div>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">
                {t(`featureItems.${f.key}.title`)}
              </h3>
              <p className="mt-1 text-slate-600">
                {t(`featureItems.${f.key}.text`)}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* 3) Jak działa Asystent? */}
      <AIHowItWorks />

      {/* 4) Dolny CTA */}
      <section className="mx-auto max-w-[var(--hd-screen-wide)] px-4 pb-10 sm:px-5">
        <div className="hd-surface p-5 text-center">
          <h2 className="text-xl font-bold text-slate-900">
            {t("ctaTitle")}
          </h2>
          <p className="mt-2 text-slate-600">
            {t("ctaText")}
          </p>
          <div className="mt-4">
            <AskAIButton />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {t("anonymous")}
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
