import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { getBySlug, plans } from "../data";

type Props = { params: { slug: string } };
const FEATURE_KEYS = ["f1", "f2", "f3"] as const;
const INCLUDE_KEYS = ["i1", "i2"] as const;
const DELIVERY_KEYS = ["d1", "d2", "d3"] as const;

export async function generateStaticParams() {
  return plans.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const plan = getBySlug(params.slug);
  if (!plan) return {};
  const t = await getTranslations("static.services.phase3b.heaven");
  const title = `HappyDate – ${t(`plans.${plan.type}.name`)}`;
  const description = t(`plans.${plan.type}.short`);
  return {
    title,
    description,
    alternates: {
      canonical: `/services/wiadomosc-z-nieba/plans/${plan.slug}`,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/services/wiadomosc-z-nieba/plans/${plan.slug}`,
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function PlanPage({ params }: Props) {
  const plan = getBySlug(params.slug);
  if (!plan) return notFound();
  const t = await getTranslations("static.services.phase3b.heaven");

  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#f8fbff] via-[#f6f2ff] to-[#fff7fb]" />

      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <nav className="mb-6 text-sm text-slate-500">
            <Link href="/services/wiadomosc-z-nieba" className="hover:underline">
              {t("badge")}
            </Link>{" "}
            / <span className="text-slate-700">{t(`plans.${plan.type}.name`)}</span>
          </nav>

          <div className="rounded-3xl border border-white/70 bg-white/70 p-8 text-center shadow-[0_16px_50px_-20px_rgba(0,0,0,.15)] backdrop-blur-lg">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">
              {t(`plans.${plan.type}.name`)}
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-slate-700">
              {t(`plans.${plan.type}.long`)}
            </p>

            <div className="mt-5 inline-flex items-baseline gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-500 px-4 py-1 text-white shadow">
              <span className="text-2xl font-extrabold">{plan.price}</span>
            </div>

            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={`/services/wiadomosc-z-nieba/order?plan=${plan.type}`}
                className="rounded-2xl bg-gradient-to-r from-fuchsia-500 to-pink-500 px-6 py-3 font-semibold text-white shadow-lg hover:brightness-110"
              >
                {t("planPage.orderPlan")}
              </Link>
              <Link
                href="/services/wiadomosc-z-nieba#pricing"
                className="rounded-2xl bg-white px-6 py-3 font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              >
                {t("planPage.backToComparison")}
              </Link>
            </div>
          </div>

          <div className="mt-10 grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-white/70 bg-white/70 p-6 shadow-[0_12px_40px_-20px_rgba(0,0,0,.12)] backdrop-blur-lg">
              <h2 className="text-xl font-semibold text-slate-900">
                {t("planPage.benefits")}
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
                {FEATURE_KEYS.map((key) => (
                  <li key={key}>{t(`plans.${plan.type}.features.${key}`)}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-white/70 bg-white/70 p-6 shadow-[0_12px_40px_-20px_rgba(0,0,0,.12)] backdrop-blur-lg">
              <h2 className="text-xl font-semibold text-slate-900">
                {t("planPage.included")}
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
                {INCLUDE_KEYS.map((key) => (
                  <li key={key}>{t(`plans.${plan.type}.includes.${key}`)}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-white/70 bg-white/70 p-6 shadow-[0_12px_40px_-20px_rgba(0,0,0,.12)] backdrop-blur-lg md:col-span-2">
              <h2 className="text-xl font-semibold text-slate-900">
                {t("planPage.delivery")}
              </h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-slate-700">
                {DELIVERY_KEYS.map((key) => (
                  <li key={key}>{t(`plans.${plan.type}.delivery.${key}`)}</li>
                ))}
              </ol>

              <div className="mt-6 text-center">
                <Link
                  href={`/services/wiadomosc-z-nieba/order?plan=${plan.type}`}
                  className="inline-flex rounded-2xl bg-gradient-to-r from-fuchsia-500 to-pink-500 px-6 py-3 font-semibold text-white shadow-lg hover:brightness-110"
                >
                  {t("planPage.proceed")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
