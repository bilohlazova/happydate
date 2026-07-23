import { useTranslations } from "next-intl";

export default function AIHowItWorks() {
  const t = useTranslations("static.services.phase3b.assistant");
  const steps = [
    { key: "s1", emoji: "🧩" },
    { key: "s2", emoji: "🎁" },
    { key: "s3", emoji: "⚡" },
  ] as const;

  return (
    <section className="mx-auto max-w-5xl px-6 py-14">
      <h2 className="text-center text-2xl md:text-3xl font-extrabold text-slate-900">
        {t("howTitle")}
      </h2>
      <p className="mt-3 text-center text-slate-600">
        {t("howSubtitle")}
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {steps.map((s) => (
          <article
            key={s.key}
            className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow ring-1 ring-black/5 text-[18px]">
                {s.emoji}
              </div>
              <div className="text-2xl font-extrabold text-slate-800">
                {t(`steps.${s.key}.n`)}
              </div>
            </div>
            <h3 className="mt-3 text-lg font-semibold text-slate-900">
              {t(`steps.${s.key}.title`)}
            </h3>
            <p className="mt-1 text-slate-600">{t(`steps.${s.key}.text`)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
