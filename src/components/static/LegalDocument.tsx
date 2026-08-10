type LegalSection = {
  title: string;
  paragraphs?: Record<string, string>;
  items?: Record<string, string>;
};

type LegalDocumentProps = {
  title: string;
  effective: string;
  sections: Record<string, LegalSection>;
  intro?: ReactNode;
};

export default function LegalDocument({
  title,
  effective,
  sections,
  intro,
}: LegalDocumentProps) {
  return (
    <main className="legal-document max-w-4xl mx-auto px-6 py-16 text-slate-800">
      <header className="legal-document__header">
        <p className="legal-document__brand">HappyDate</p>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-sm text-slate-500">{effective}</p>
      </header>

      {intro}

      <div className="legal-document__body space-y-8 text-sm leading-relaxed">
        {Object.entries(sections).map(([key, section]) => (
          <section key={key}>
            <h2 className="font-semibold mb-2">{section.title}</h2>
            {Object.values(section.paragraphs ?? {}).map((paragraph) => (
              <p key={paragraph} className="mt-2 first:mt-0">
                {paragraph}
              </p>
            ))}
            {section.items && (
              <ul className="list-disc pl-5 space-y-1 mt-2">
                {Object.values(section.items).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
import type { ReactNode } from "react";
