import type { Metadata } from "next";
import { getMessages, getTranslations } from "next-intl/server";

import LegalDocument from "@/components/static/LegalDocument";
import { ComingSoonNotice } from "@/components/ui/ComingSoonNotice";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("static.legal.returns");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function RegulaminZwrotow() {
  const messages = await getMessages();
  const legal = messages.static.legal;
  const guide = legal.returns.guide;

  return (
    <LegalDocument
      title={legal.returns.title}
      effective={legal.common.effective}
      sections={legal.returns.sections}
      intro={
        <section className="returns-guide" aria-labelledby="returns-guide-title">
          <div className="returns-guide__heading">
            <p className="privacy-trust__eyebrow">{guide.eyebrow}</p>
            <h2 id="returns-guide-title">{guide.title}</h2>
            <p>{guide.subtitle}</p>
          </div>

          <ComingSoonNotice
            className="returns-guide__soon"
            badge={guide.soon.badge}
            title={guide.soon.title}
            description={guide.soon.text}
          />

          <div className="returns-guide__steps">
            {Object.values(guide.steps).map((step, index) => (
              <article key={step.title}>
                <span>{index + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </article>
            ))}
          </div>

          <p className="returns-guide__legal-note">{guide.legalNote}</p>
        </section>
      }
    />
  );
}
