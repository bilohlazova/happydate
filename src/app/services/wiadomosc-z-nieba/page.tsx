import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ComingSoonNotice } from "@/components/ui/ComingSoonNotice";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("static.services.phase3b.heaven");
  return { title: t("metaTitle"), description: t("metaDescription"), alternates: { canonical: "/services/wiadomosc-z-nieba" } };
}

export default async function WiadomoscZNiebaPage() {
  const t = await getTranslations("static.services.phase3b.heaven");
  const promises = ["storage", "access", "delivery", "legacy"] as const;
  const journey = ["create", "review", "wait", "deliver"] as const;

  return (
    <main className="heaven-preview">
      <section className="heaven-preview__hero">
        <Link href="/services">{t("preview.back")}</Link>
        <div className="heaven-preview__hero-copy">
          <p className="heaven-preview__eyebrow">{t("preview.eyebrow")}</p>
          <h1>{t("preview.title")}</h1>
          <p>{t("preview.subtitle")}</p>
        </div>
        <div className="heaven-preview__moon" aria-hidden="true">☾<span>✦</span></div>
        <ComingSoonNotice badge={t("preview.soon.badge")} title={t("preview.soon.title")} description={t("preview.soon.text")} />
      </section>

      <section className="heaven-preview__section" aria-labelledby="heaven-promise-title">
        <div className="heaven-preview__heading"><p className="heaven-preview__eyebrow">{t("preview.promiseEyebrow")}</p><h2 id="heaven-promise-title">{t("preview.promiseTitle")}</h2><p>{t("preview.promiseSubtitle")}</p></div>
        <div className="heaven-preview__promise-grid">{promises.map((key) => <article key={key}><span aria-hidden="true">{key === "storage" ? "▣" : key === "access" ? "🔐" : key === "delivery" ? "↗" : "♡"}</span><h3>{t(`preview.promises.${key}.title`)}</h3><p>{t(`preview.promises.${key}.text`)}</p></article>)}</div>
      </section>

      <section className="heaven-preview__section" aria-labelledby="heaven-journey-title">
        <div className="heaven-preview__heading"><h2 id="heaven-journey-title">{t("preview.journeyTitle")}</h2><p>{t("preview.journeySubtitle")}</p></div>
        <ol className="heaven-preview__journey">{journey.map((key, index) => <li key={key}><span>{index + 1}</span><div><h3>{t(`preview.journey.${key}.title`)}</h3><p>{t(`preview.journey.${key}.text`)}</p></div></li>)}</ol>
      </section>

      <aside className="heaven-preview__truth"><span aria-hidden="true">🛡</span><div><h2>{t("preview.truthTitle")}</h2><p>{t("preview.truthText")}</p></div></aside>
    </main>
  );
}
