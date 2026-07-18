// src/app/care/page.tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("care.page");
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: { canonical: "/care" },
    openGraph: {
      title: "HappyDate Care",
      description: t("intro"),
      type: "website",
      url: "https://happydate.pl/care",
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function CarePage() {
  const t = await getTranslations("care.page");
  const topicT = await getTranslations("care.topics");
  const topics = ["technical", "gift", "questions"] as const;
  const icons = { technical: "🗓️", gift: "🎁", questions: "💬" };
  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-rose-50 to-amber-50 pb-[calc(var(--hd-nav-height)+env(safe-area-inset-bottom))]">
      {/* HERO */}
      <section className="bg-gradient-to-r from-sky-100 via-pink-100 to-amber-100 px-4 py-12 text-center">
        <h1 className="text-[2.35rem] font-extrabold leading-tight text-slate-900 md:text-5xl">
          💛 HappyDate Care
        </h1>
        <p className="mx-auto mt-4 max-w-[var(--hd-screen-wide)] text-base font-medium leading-7 text-slate-700 md:text-xl">
          {t("subtitle")}
        </p>
      </section>

      {/* CZYM JEST CARE */}
      <section className="mx-auto max-w-[var(--hd-screen-wide)] px-4 py-8">
        <div className="hd-surface p-5">
          <h2 className="text-2xl font-extrabold text-slate-900">
            {t("aboutTitle")}
          </h2>
          <p className="mt-4 text-slate-700 leading-relaxed">{t("intro")}</p>
        </div>
      </section>

      {/* W CZYM POMAGAMY */}
      <section className="mx-auto max-w-[var(--hd-screen-wide)] px-4 py-6">
        <h3 className="mb-5 text-center text-2xl font-extrabold">
          {t("helpTitle")}
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          {topics.map((topic) => (
            <div key={topic} className="hd-surface p-4">
              <div className="text-3xl">{icons[topic]}</div>
              <h4 className="mt-3 font-semibold text-lg">
                {topicT(`${topic}.title`)}
              </h4>
              <p className="mt-2 text-slate-600">
                {topicT(`${topic}.description`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FILOZOFIA */}
      <section className="mx-auto max-w-[var(--hd-screen-wide)] px-4 py-8">
        <div className="hd-surface bg-gradient-to-br from-sky-50 to-pink-50 p-5">
          <h3 className="text-2xl font-extrabold text-slate-900">
            {t("approachTitle")}
          </h3>
          <p className="mt-4 text-slate-700 leading-relaxed">{t("approach")}</p>
        </div>
      </section>

      {/* KONTAKT */}
      <section className="mx-auto max-w-[var(--hd-screen-wide)] px-4 py-8">
        <div className="hd-surface p-5 text-center">
          <h3 className="text-2xl font-extrabold text-slate-900">
            {t("contactTitle")}
          </h3>
          <p className="mt-3 text-slate-700 max-w-xl mx-auto">{t("closing")}</p>
          <div className="mt-6 flex flex-col items-center gap-2">
            <a
              href="mailto:hello@happydate.pl"
              className="inline-block rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 px-8 py-3 font-semibold text-white shadow hover:shadow-lg transition"
            >
              hello@happydate.pl
            </a>
            <p className="text-xs text-slate-500 mt-2">{t("response")}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
