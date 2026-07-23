import { useTranslations } from "next-intl";

export default function AIFAQ() {
  const commonT = useTranslations("static.services.phase3b");
  const t = useTranslations("static.services.phase3b.assistant");
  const items = ["f1", "f2", "f3", "f4", "f5"] as const;

  return (
    <section className="mx-auto max-w-5xl px-6 py-14">
      <h2 className="mb-8 text-center text-2xl md:text-3xl font-extrabold text-neutral-900">
        {commonT("faq")}
      </h2>
      <div className="grid gap-4">
        {items.map((key) => (
          <details
            key={key}
            className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
          >
            <summary className="cursor-pointer font-semibold">
              {t(`faqs.${key}.q`)}
            </summary>
            <p className="mt-2 text-neutral-700">{t(`faqs.${key}.a`)}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
