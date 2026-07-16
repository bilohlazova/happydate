"use client";

import { HeartHandshake } from "lucide-react";
import { useTranslations } from "next-intl";

import { AddPersonMenu } from "@/components/people/AddPersonMenu";

export function PeopleHeader() {
  const t = useTranslations("people");
  return (
    <section className="flex items-end justify-between gap-3">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-[1.85rem] font-black leading-none text-slate-950 sm:text-[2.1rem]">
            {t("page.title")}
          </h1>
          <HeartHandshake
            className="mt-0.5 h-6 w-6 text-blue-600 sm:h-7 sm:w-7"
            strokeWidth={2.25}
          />
        </div>
        <p className="mt-0.5 text-[0.85rem] font-semibold leading-snug text-slate-500">
          {t("page.subtitle")}
        </p>
      </div>

      <div className="shrink-0">
        <AddPersonMenu />
      </div>
    </section>
  );
}
