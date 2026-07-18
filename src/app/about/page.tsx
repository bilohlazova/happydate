// src/app/about/page.tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

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
  const steps = ["calendar", "tips", "calm"] as const;
  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-rose-50 to-amber-50">
      {/* HERO */}
      <section className="text-center py-24 px-6 bg-gradient-to-r from-sky-100 via-pink-100 to-amber-100">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900">
          {t("title")}
        </h1>
        <p className="mt-6 text-lg md:text-xl text-slate-700 max-w-3xl mx-auto">
          {t("intro")}
        </p>
        <p className="mt-5 text-lg md:text-xl text-slate-800 max-w-3xl mx-auto">
          {t("belief")}
        </p>
      </section>

      {/* MISJA */}
      <section className="py-16 container mx-auto px-6 max-w-5xl">
        <div className="rounded-3xl bg-white shadow-xl ring-1 ring-black/5 p-8 md:p-10">
          <h2 className="text-3xl font-extrabold text-slate-900">
            {t("missionTitle")}
          </h2>
          <p className="mt-4 text-slate-700 leading-relaxed">{t("mission")}</p>
        </div>
      </section>

      {/* WARTOŚCI */}
      <section className="py-8 container mx-auto px-6 max-w-5xl">
        <h3 className="text-2xl font-extrabold text-center mb-10">
          {t("valuesTitle")}
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          {values.map(([icon, key]) => (
            <div
              key={key}
              className="bg-white rounded-2xl p-6 shadow ring-1 ring-black/5"
            >
              <div className="text-3xl">{icon}</div>
              <h4 className="mt-3 font-semibold text-lg">
                {t(`values.${key}.title`)}
              </h4>
              <p className="mt-2 text-slate-600">{t(`values.${key}.text`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* JAK DZIAŁA */}
      <section className="py-16 container mx-auto px-6 max-w-5xl">
        <h3 className="text-2xl font-extrabold text-center mb-10">
          {t("howTitle")}
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((key, index) => (
            <div
              key={key}
              className="bg-white rounded-2xl p-6 text-center shadow ring-1 ring-black/5"
            >
              <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-sky-100 text-sky-700 font-bold">
                {index + 1}
              </div>
              <h4 className="mt-3 font-semibold">{t(`steps.${key}.title`)}</h4>
              <p className="mt-2 text-slate-600">{t(`steps.${key}.text`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* KONTAKT / OPEN IDEAS */}
      <section className="py-16 container mx-auto px-6 max-w-4xl">
        <div className="rounded-3xl bg-white shadow-xl ring-1 ring-black/5 p-8 md:p-10 text-center">
          <h3 className="text-2xl font-extrabold text-slate-900">
            {t("contactTitle")}
          </h3>
          <p className="mt-3 text-slate-700 max-w-xl mx-auto">{t("contact")}</p>
          <div className="mt-6 flex flex-col items-center gap-2">
            <a
              href="mailto:hello@happydate.pl"
              className="inline-block rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 px-8 py-3 font-semibold text-white shadow hover:shadow-lg transition"
            >
              hello@happydate.pl
            </a>
            <p className="text-xs text-slate-500 mt-2">{t("contactNote")}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
