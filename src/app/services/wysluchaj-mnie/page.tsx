import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("static.services.phase3b.listener");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: "/services/wysluchaj-mnie" },
    openGraph: {
      title: t("metaTitle"),
      description: t("ogDescription"),
      type: "website",
      url: "https://happydate.pl/services/wysluchaj-mnie",
    },
    twitter: { card: "summary_large_image" },
  };
}

const HOW_STEPS = [
  { emoji: "📝", key: "s1" },
  { emoji: "🤝", key: "s2" },
  { emoji: "💬", key: "s3" },
] as const;

const GIFT_ITEMS = [
  { emoji: "🖨️", key: "pdf" },
  { emoji: "✉️", key: "email" },
  { emoji: "🕊️", key: "anon" },
] as const;

const FAQ_KEYS = ["f1", "f2", "f3"] as const;
const BULLET_KEYS = ["b1", "b2", "b3", "b4"] as const;

export default async function WysluchajMniePage() {
  const t = await getTranslations("static.services.phase3b.listener");
  const commonT = await getTranslations("static.services.phase3b");

  return (
    <main className="overflow-x-hidden">
      <section className="relative isolate py-24 text-center">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-br from-sky-100 via-blue-50 to-emerald-50"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(70%_60%_at_50%_40%,#000_40%,transparent_100%)]"
          style={{
            background:
              "radial-gradient(60rem 25rem at 50% 20%, rgba(56,189,248,.25), transparent 60%), radial-gradient(40rem 30rem at 80% 80%, rgba(16,185,129,.18), transparent 60%)",
          }}
        />
        <div className="container mx-auto max-w-3xl px-4">
          <h1 className="text-4xl font-extrabold text-neutral-900 md:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-4 text-lg text-neutral-700 md:text-xl">
            {t("subtitle")}
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/survey?flow=listener"
              className="inline-flex items-center rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 px-6 py-3 font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              {t("book")}
            </Link>
            <Link
              href="#gift"
              className="inline-flex items-center rounded-2xl bg-white/80 backdrop-blur px-6 py-3 font-semibold text-sky-700 ring-1 ring-sky-200 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              {t("gift")}
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="container mx-auto max-w-4xl px-4 grid md:grid-cols-2 gap-10 items-center">
          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-3 rounded-[28px] bg-gradient-to-br from-sky-200/70 via-blue-100/60 to-emerald-100/70 blur-xl"
            />
            <figure className="relative overflow-hidden rounded-[28px] bg-white shadow-xl ring-1 ring-black/5">
              <Image
                src="/images/wysluchaj1.png"
                alt={t("imageAlt")}
                width={1200}
                height={800}
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className="h-auto w-full object-cover"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent"
              />
            </figure>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-3 text-neutral-900">
              {t("aboutTitle")}
            </h2>
            <p className="text-neutral-700 leading-relaxed">{t("aboutText")}</p>
            <ul className="mt-5 space-y-2 text-neutral-700">
              {BULLET_KEYS.map((key) => (
                <li key={key}>{t(`bullets.${key}`)}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto max-w-5xl px-4 text-center">
          <div className="mx-auto mb-10 max-w-xl">
            <h2 className="text-3xl font-extrabold text-neutral-900">
              {commonT("howItWorks")}
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3 text-left">
            {HOW_STEPS.map((step) => (
              <div
                key={step.key}
                className="rounded-2xl bg-white/80 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur"
              >
                <div className="text-3xl mb-3">{step.emoji}</div>
                <h3 className="font-semibold text-lg mb-2 text-neutral-900">
                  {t(`how.${step.key}.title`)}
                </h3>
                <p className="text-neutral-600">{t(`how.${step.key}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white" id="cennik">
        <div className="container mx-auto max-w-5xl px-4">
          <h2 className="text-3xl font-extrabold text-neutral-900 text-center mb-10">
            {t("pricing")}
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-sky-100 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-neutral-900">
                  {t("plans.p30.title")}
                </h3>
                <span className="rounded-full bg-sky-50 text-sky-700 text-xs px-3 py-1 border border-sky-200">
                  {t("plans.p30.badge")}
                </span>
              </div>
              <p className="mt-2 text-neutral-600">{t("plans.p30.desc")}</p>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-neutral-900">79 zł</span>
                <span className="text-neutral-400 text-sm">{t("gross")}</span>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/survey?flow=listener&plan=30"
                  className="inline-flex items-center rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 px-5 py-2.5 font-semibold text-white shadow-lg hover:-translate-y-0.5 hover:shadow-xl"
                >
                  {t("bookShort")}
                </Link>
                <Link
                  href="/checkout/listener-voucher?duration=30"
                  className="inline-flex items-center rounded-2xl bg-white px-5 py-2.5 font-semibold text-sky-700 ring-1 ring-sky-200 shadow-sm hover:bg-sky-50"
                >
                  {t("buyVoucher")}
                </Link>
              </div>
              <ul className="mt-4 text-sm text-neutral-600 space-y-1">
                <li>{t("plans.p30.f1")}</li>
                <li>{t("plans.p30.f2")}</li>
                <li>{t("plans.p30.f3")}</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-emerald-100 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-neutral-900">
                  {t("plans.p60.title")}
                </h3>
                <span className="rounded-full bg-emerald-50 text-emerald-700 text-xs px-3 py-1 border border-emerald-200">
                  {t("plans.p60.badge")}
                </span>
              </div>
              <p className="mt-2 text-neutral-600">{t("plans.p60.desc")}</p>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-neutral-900">129 zł</span>
                <span className="text-neutral-400 text-sm">{t("gross")}</span>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/survey?flow=listener&plan=60"
                  className="inline-flex items-center rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 font-semibold text-white shadow-lg hover:-translate-y-0.5 hover:shadow-xl"
                >
                  {t("bookShort")}
                </Link>
                <Link
                  href="/checkout/listener-voucher?duration=60"
                  className="inline-flex items-center rounded-2xl bg-white px-5 py-2.5 font-semibold text-emerald-700 ring-1 ring-emerald-200 shadow-sm hover:bg-emerald-50"
                >
                  {t("buyVoucher")}
                </Link>
              </div>
              <ul className="mt-4 text-sm text-neutral-600 space-y-1">
                <li>{t("plans.p60.f1")}</li>
                <li>{t("plans.p60.f2")}</li>
                <li>{t("plans.p60.f3")}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section
        className="py-20 bg-gradient-to-br from-sky-50 via-blue-50 to-emerald-50"
        id="gift"
      >
        <div className="container mx-auto max-w-4xl px-4">
          <h2 className="text-3xl font-extrabold text-neutral-900 text-center mb-3">
            {t("giftTitle")}
          </h2>
          <p className="text-center text-neutral-700 max-w-2xl mx-auto">
            {t("giftText")}
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {GIFT_ITEMS.map((item) => (
              <div
                key={item.key}
                className="rounded-2xl bg-white/80 p-5 shadow-sm ring-1 ring-black/5 backdrop-blur"
              >
                <div className="text-2xl">{item.emoji}</div>
                <h3 className="mt-2 font-semibold text-neutral-900">
                  {t(`giftItems.${item.key}.title`)}
                </h3>
                <p className="text-neutral-600 text-sm">
                  {t(`giftItems.${item.key}.text`)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/checkout/listener-voucher?duration=30"
              className="inline-flex items-center rounded-2xl bg-white px-5 py-2.5 font-semibold text-sky-700 ring-1 ring-sky-200 shadow-sm hover:bg-sky-50"
            >
              {t("voucher30")}
            </Link>
            <Link
              href="/checkout/listener-voucher?duration=60"
              className="inline-flex items-center rounded-2xl bg-white px-5 py-2.5 font-semibold text-emerald-700 ring-1 ring-emerald-200 shadow-sm hover:bg-emerald-50"
            >
              {t("voucher60")}
            </Link>
            <Link
              href="/survey?flow=listener&gift=1"
              className="inline-flex items-center rounded-2xl bg-gradient-to-r from-pink-500 to-orange-500 px-6 py-3 font-semibold text-white shadow-lg hover:-translate-y-0.5 hover:shadow-xl"
            >
              {t("dedication")}
            </Link>
          </div>

          <p className="mt-4 text-center text-xs text-neutral-500">
            {t("note")}
          </p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="container mx-auto max-w-4xl px-4">
          <h2 className="text-2xl font-extrabold text-neutral-900 mb-6">
            FAQ
          </h2>
          <div className="space-y-4">
            {FAQ_KEYS.map((key) => (
              <details key={key} className="rounded-2xl border p-4">
                <summary className="cursor-pointer font-semibold">
                  {t(`faqs.${key}.q`)}
                </summary>
                <p className="mt-2 text-neutral-700">{t(`faqs.${key}.a`)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
