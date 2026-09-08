import { getTranslations } from "next-intl/server";

export default async function ContactPage() {
  const t = await getTranslations("navigation.footer");
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-extrabold text-slate-900">{t("contact")}</h1>
      <p className="mt-4 text-slate-600">contact@happydate.pl</p>
    </section>
  );
}
