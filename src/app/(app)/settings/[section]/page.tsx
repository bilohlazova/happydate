"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

export default function SettingsSectionPage() {
  const t = useTranslations("profile");
  const { section } = useParams<{ section: string }>();
  const title = section === "personalization" ? t("settings.giftLearning.title") : section === "notifications" ? t("settings.notifications") : section === "plan" ? t("settings.title") : section === "app" ? t("settings.language.title") : section;
  return <main className="hd-page-shell"><div className="hd-page-shell__container"><section className="hd-page-card"><header className="hd-page-card__header"><Link href="/settings" className="hd-page-back">← {t("settings.title")}</Link><div className="hd-page-heading"><div><h1>{title}</h1><p>{t("subtitle")}</p></div></div></header><div className="hd-page-card__body"><p className="rounded-2xl bg-slate-50 p-5 text-slate-600">{t("future.soon")}</p></div></section></div></main>;
}
