import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ComingSoonNotice } from "@/components/ui/ComingSoonNotice";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("static.services.phase3b.listener");
  return { title: t("metaTitle"), description: t("metaDescription"), alternates: { canonical: "/services/wysluchaj-mnie" } };
}

export default async function WysluchajMniePage() {
  const t = await getTranslations("static.services.phase3b.listener");
  const principles = ["presence", "choice", "safety"] as const;
  const readiness = ["people", "process", "privacy", "crisis"] as const;

  return (
    <main className="listener-preview">
      <section className="listener-preview__hero">
        <Link href="/services" className="listener-preview__back">{t("preview.back")}</Link>
        <div className="listener-preview__hero-grid">
          <div>
            <p className="listener-preview__eyebrow">{t("preview.eyebrow")}</p>
            <h1>{t("preview.title")}</h1>
            <p className="listener-preview__intro">{t("preview.subtitle")}</p>
          </div>
          <div className="listener-preview__symbol" aria-hidden="true"><span>💬</span><small>♡</small></div>
        </div>
        <ComingSoonNotice badge={t("preview.soon.badge")} title={t("preview.soon.title")} description={t("preview.soon.text")} />
      </section>

      <section className="listener-preview__section" aria-labelledby="listener-principles">
        <div className="listener-preview__heading"><h2 id="listener-principles">{t("preview.principlesTitle")}</h2><p>{t("preview.principlesSubtitle")}</p></div>
        <div className="listener-preview__cards">
          {principles.map((key) => <article key={key}><span aria-hidden="true">{key === "presence" ? "◌" : key === "choice" ? "↔" : "🛡"}</span><h3>{t(`preview.principles.${key}.title`)}</h3><p>{t(`preview.principles.${key}.text`)}</p></article>)}
        </div>
      </section>

      <section className="listener-preview__section listener-preview__readiness" aria-labelledby="listener-readiness">
        <div className="listener-preview__heading"><p className="listener-preview__eyebrow">{t("preview.beforeLaunchEyebrow")}</p><h2 id="listener-readiness">{t("preview.beforeLaunchTitle")}</h2></div>
        <ol>{readiness.map((key, index) => <li key={key}><span>{index + 1}</span><div><h3>{t(`preview.readiness.${key}.title`)}</h3><p>{t(`preview.readiness.${key}.text`)}</p></div></li>)}</ol>
      </section>

      <aside className="listener-preview__boundary">
        <span aria-hidden="true">!</span><div><h2>{t("preview.boundaryTitle")}</h2><p>{t("preview.boundaryText")}</p></div>
      </aside>
    </main>
  );
}
