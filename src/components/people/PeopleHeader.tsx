"use client";

import { HeartHandshake, ShieldCheck, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { AddPersonMenu } from "@/components/people/AddPersonMenu";

export function PeopleHeader() {
  const t = useTranslations("people");
  return (
    <header className="people-page-header relative flex items-end justify-between gap-4 overflow-hidden">
      <div className="people-page-header__copy relative z-10 min-w-0">
        <p className="people-page-header__eyebrow">{t("page.eyebrow")}</p>
        <div className="flex items-center gap-3">
          <h1 className="people-page-header__title text-[1.85rem] font-black leading-none text-slate-950 sm:text-[2.1rem]">
            {t("page.title")}
          </h1>
          <HeartHandshake
            className="people-page-header__heart mt-0.5 h-7 w-7 text-blue-600 sm:h-8 sm:w-8"
            strokeWidth={2.25}
          />
        </div>
        <p className="people-page-header__subtitle mt-1 text-[0.85rem] font-semibold leading-snug text-slate-500">
          {t("page.subtitle")}
        </p>
        <div className="people-page-header__trust mt-3 hidden items-center gap-2 sm:flex">
          <span><ShieldCheck />{t("page.privateBadge")}</span>
          <span><Sparkles />{t("page.careBadge")}</span>
        </div>
      </div>

      <div className="people-page-header__action relative z-10 shrink-0">
        <AddPersonMenu />
      </div>
      <span className="people-page-header__glow" aria-hidden="true" />
    </header>
  );
}
