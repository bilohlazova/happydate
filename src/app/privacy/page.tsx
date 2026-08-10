import type { Metadata } from "next";
import Link from "next/link";
import { getMessages, getTranslations } from "next-intl/server";

import LegalDocument from "@/components/static/LegalDocument";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("static.legal.privacy");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function PrivacyPolicy() {
  const messages = await getMessages();
  const legal = messages.static.legal;
  const trust = legal.privacy.trust;

  return (
    <LegalDocument
      title={legal.privacy.title}
      effective={legal.common.effective}
      sections={legal.privacy.sections}
      intro={
        <section className="privacy-trust" aria-labelledby="privacy-trust-title">
          <div className="privacy-trust__heading">
            <span aria-hidden="true">🤍</span>
            <div>
              <p className="privacy-trust__eyebrow">{trust.eyebrow}</p>
              <h2 id="privacy-trust-title">{trust.title}</h2>
              <p>{trust.subtitle}</p>
            </div>
          </div>

          <div className="privacy-trust__grid">
            {Object.values(trust.items).map((item) => (
              <article key={item.title} className="privacy-trust__item">
                <span aria-hidden="true">{item.icon}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="privacy-trust__actions">
            <Link href="/settings/export">{trust.exportAction}</Link>
            <a href="mailto:privacy@happydate.pl">{trust.contactAction}</a>
          </div>
          <p className="privacy-trust__legal-note">{trust.legalNote}</p>
        </section>
      }
    />
  );
}
