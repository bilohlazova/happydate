import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import AskAIButton from "@/components/services/AskAIButton";
import ChatModalControllerAI from "@/components/services/ChatModalControllerAI";
import { ComingSoonNotice } from "@/components/ui/ComingSoonNotice";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("static.services.phase3b.assistant");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: "/services/asystent-ai" },
  };
}

export default async function AsystentAIPage() {
  const t = await getTranslations("static.services.phase3b.assistant");
  const features = ["context", "honesty", "continuity"] as const;
  const steps = ["describe", "ideas", "save"] as const;

  return (
    <main className="gift-ai-soul">
      <section className="gift-ai-soul__hero">
        <div>
          <span className="gift-ai-soul__available">{t("availableNow")}</span>
          <p className="gift-ai-soul__eyebrow">HappyDate AI</p>
          <h1>{t("currentTitle")}</h1>
          <p className="gift-ai-soul__intro">{t("currentSubtitle")}</p>
          <div className="gift-ai-soul__actions">
            <AskAIButton />
            <Link href="/privacy">{t("privacyAction")}</Link>
          </div>
          <p className="gift-ai-soul__boundary">{t("aiBoundary")}</p>
        </div>
        <div className="gift-ai-soul__thought" aria-hidden="true">
          <span>✦</span><span>♡</span><span>🎁</span>
        </div>
      </section>

      <section className="gift-ai-soul__section" aria-labelledby="gift-ai-features">
        <div className="gift-ai-soul__heading">
          <h2 id="gift-ai-features">{t("currentFeaturesTitle")}</h2>
          <p>{t("currentFeaturesSubtitle")}</p>
        </div>
        <div className="gift-ai-soul__features">
          {features.map((key) => (
            <article key={key}>
              <span aria-hidden="true">{key === "context" ? "◌" : key === "honesty" ? "✓" : "↗"}</span>
              <h3>{t(`currentFeatures.${key}.title`)}</h3>
              <p>{t(`currentFeatures.${key}.text`)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="gift-ai-soul__section" aria-labelledby="gift-ai-steps">
        <div className="gift-ai-soul__heading"><h2 id="gift-ai-steps">{t("currentHowTitle")}</h2></div>
        <div className="gift-ai-soul__steps">
          {steps.map((key, index) => (
            <article key={key}><span>{index + 1}</span><div><h3>{t(`currentSteps.${key}.title`)}</h3><p>{t(`currentSteps.${key}.text`)}</p></div></article>
          ))}
        </div>
      </section>

      <section className="gift-ai-soul__section">
        <ComingSoonNotice badge={t("soon.badge")} title={t("soon.title")} description={t("soon.text")} />
        <p className="gift-ai-soul__soon-detail">{t("soon.detail")}</p>
      </section>

      <ChatModalControllerAI />
    </main>
  );
}
