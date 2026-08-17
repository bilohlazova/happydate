import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ComingSoonNotice } from "@/components/ui/ComingSoonNotice";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("static.services");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: true, follow: true },
    alternates: { canonical: "/services" },
  };
}

const FUTURE_SERVICES = [
  ["💬", "listen"],
  ["🌙", "heaven"],
  ["🎥", "group"],
  ["💸", "fund"],
  ["🕊️", "good"],
] as const;

export default async function ServicesPage() {
  const t = await getTranslations("static.services");

  return (
    <main className="services-soul">
      <section className="services-soul__hero">
        <p className="services-soul__eyebrow">{t("eyebrow")}</p>
        <h1>{t("title")}</h1>
        <p>{t("subtitle")}</p>
      </section>

      <section className="services-soul__current" aria-labelledby="current-care-title">
        <div className="services-soul__care-copy">
          <span className="services-soul__status">{t("availableNow")}</span>
          <p className="services-soul__eyebrow">HappyDate Care</p>
          <h2 id="current-care-title">{t("currentTitle")}</h2>
          <p>{t("careDescription")}</p>
          <div className="services-soul__features">
            {(["dates", "notes", "reminders", "briefing"] as const).map((key) => (
              <span key={key}>✓ {t(`currentFeatures.${key}`)}</span>
            ))}
          </div>
          <Link href="/care">{t("see")}</Link>
        </div>
        <div className="services-soul__care-heart" aria-hidden="true">
          <span>💛</span>
          <small>{t("freeNow")}</small>
        </div>
      </section>

      <section className="services-soul__future" aria-labelledby="future-services-title">
        <div className="services-soul__section-heading">
          <p className="services-soul__eyebrow">{t("futureEyebrow")}</p>
          <h2 id="future-services-title">{t("rituals")}</h2>
          <p>{t("futureSubtitle")}</p>
        </div>

        <ComingSoonNotice
          badge={t("soon")}
          title={t("futureNoticeTitle")}
          description={t("futureNoticeText")}
        />

        <div className="services-soul__future-grid">
          {FUTURE_SERVICES.map(([emoji, key]) => (
            <article key={key}>
              <span className="services-soul__future-icon" aria-hidden="true">{emoji}</span>
              <div>
                <span className="services-soul__soon-badge">{t("soon")}</span>
                <h3>{t(`items.${key}.title`)}</h3>
                <p>{t(`items.${key}.description`)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="services-soul__principle">
        <span aria-hidden="true">✦</span>
        <div>
          <h2>{t("principleTitle")}</h2>
          <p>{t("principleText")}</p>
        </div>
      </section>
    </main>
  );
}
