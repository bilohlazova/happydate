import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ComingSoonNotice } from "@/components/ui/ComingSoonNotice";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("static.about");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: "/about" },
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      type: "website",
      url: "https://happydate.pl/about",
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function AboutPage() {
  const t = await getTranslations("static.about");
  const values = [
    ["💛", "empathy"],
    ["🔒", "trust"],
    ["✨", "simplicity"],
  ] as const;
  const brains = [
    ["◌", "memory"],
    ["♡", "care"],
    ["✦", "conversation"],
  ] as const;
  const steps = ["calendar", "tips", "calm"] as const;

  return (
    <main className="about-soul">
      <section className="about-soul__hero">
        <div className="about-soul__hero-copy">
          <p className="about-soul__eyebrow">{t("eyebrow")}</p>
          <h1>{t("title")}</h1>
          <p className="about-soul__intro">{t("intro")}</p>
          <p className="about-soul__belief">{t("belief")}</p>
          <div className="about-soul__actions">
            <Link href="/auth/register" className="about-soul__primary">
              {t("startAction")}
            </Link>
            <Link href="/privacy" className="about-soul__secondary">
              {t("trustAction")}
            </Link>
          </div>
        </div>

        <div className="about-soul__orbit" aria-label={t("personSystemLabel")}>
          <div className="about-soul__person">
            <span aria-hidden="true">☺</span>
            <strong>{t("personSystem.person")}</strong>
          </div>
          {(["events", "memories", "notes", "gifts", "conversations"] as const).map(
            (key, index) => (
              <span key={key} className={`about-soul__orbit-item about-soul__orbit-item--${index + 1}`}>
                {t(`personSystem.${key}`)}
              </span>
            ),
          )}
        </div>
      </section>

      <section className="about-soul__mission">
        <p className="about-soul__eyebrow">{t("missionTitle")}</p>
        <h2>{t("missionHeadline")}</h2>
        <p>{t("mission")}</p>
      </section>

      <section className="about-soul__section" aria-labelledby="about-brains-title">
        <div className="about-soul__section-heading">
          <p className="about-soul__eyebrow">{t("brainsEyebrow")}</p>
          <h2 id="about-brains-title">{t("brainsTitle")}</h2>
          <p>{t("brainsSubtitle")}</p>
        </div>
        <div className="about-soul__brains">
          {brains.map(([icon, key]) => (
            <article key={key}>
              <span aria-hidden="true">{icon}</span>
              <h3>{t(`brains.${key}.title`)}</h3>
              <p>{t(`brains.${key}.text`)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-soul__section about-soul__values" aria-labelledby="about-values-title">
        <div className="about-soul__section-heading">
          <h2 id="about-values-title">{t("valuesTitle")}</h2>
        </div>
        <div className="about-soul__value-grid">
          {values.map(([icon, key]) => (
            <article key={key}>
              <span aria-hidden="true">{icon}</span>
              <h3>{t(`values.${key}.title`)}</h3>
              <p>{t(`values.${key}.text`)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-soul__section" aria-labelledby="about-how-title">
        <div className="about-soul__section-heading">
          <h2 id="about-how-title">{t("howTitle")}</h2>
        </div>
        <div className="about-soul__steps">
          {steps.map((key, index) => (
            <article key={key}>
              <span>{index + 1}</span>
              <div>
                <h3>{t(`steps.${key}.title`)}</h3>
                <p>{t(`steps.${key}.text`)}</p>
              </div>
            </article>
          ))}
        </div>
        <ComingSoonNotice
          className="about-soul__soon"
          badge={t("future.badge")}
          title={t("future.title")}
          description={t("future.text")}
        />
      </section>

      <section className="about-soul__contact">
        <span aria-hidden="true">💌</span>
        <h2>{t("contactTitle")}</h2>
        <p>{t("contact")}</p>
        <a href="mailto:hello@happydate.pl">hello@happydate.pl</a>
        <small>{t("contactNote")}</small>
      </section>
    </main>
  );
}
