import type { Metadata } from "next";
import { getMessages, getTranslations } from "next-intl/server";

import LegalDocument from "@/components/static/LegalDocument";
import { ComingSoonNotice } from "@/components/ui/ComingSoonNotice";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("static.legal.terms");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function RegulaminPage() {
  const messages = await getMessages();
  const legal = messages.static.legal;
  const guide = legal.terms.guide;

  return (
    <LegalDocument
      title={legal.terms.title}
      effective={legal.common.effective}
      sections={legal.terms.sections}
      intro={
        <section className="terms-guide" aria-labelledby="terms-guide-title">
          <div className="terms-guide__heading">
            <p className="privacy-trust__eyebrow">{guide.eyebrow}</p>
            <h2 id="terms-guide-title">{guide.title}</h2>
            <p>{guide.subtitle}</p>
          </div>

          <div className="terms-guide__grid">
            {Object.values(guide.items).map((item) => (
              <article key={item.title}>
                <span aria-hidden="true">{item.icon}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </article>
            ))}
          </div>

          <ComingSoonNotice
            className="terms-guide__soon"
            badge={guide.soon.badge}
            title={guide.soon.title}
            description={guide.soon.text}
          />

          <p className="terms-guide__legal-note">{guide.legalNote}</p>
        </section>
      }
    />
  );
}
