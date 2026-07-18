"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

import type { PersonGender } from "@/lib/repositories/person.types";

interface GenderSelectFieldProps {
  value: PersonGender;
  onChange: (value: PersonGender) => void;
  localized?: boolean;
}

const OPTIONS: PersonGender[] = ["female", "male", "other", "unspecified"];

export function GenderSelectField({ value, onChange }: GenderSelectFieldProps) {
  const t = useTranslations("personForm");
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-black text-slate-600">{t("fields.gender")}</label>
        <span className="text-[0.65rem] font-bold text-slate-400">
          {t("gender.optional")}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 items-center justify-between rounded-[0.95rem] border border-slate-100 bg-white px-4 text-left text-[16px] font-semibold text-slate-800 shadow-[0_8px_22px_rgba(15,23,42,0.05)]"
      >
        <span>{t(value === "unspecified" ? "gender.unspecifiedClosed" : `gender.${value}`)}</span>
        <span className="text-xs font-black text-sky-600">{t("gender.change")}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[130]">
          <button
            type="button"
            aria-label={t("gender.close")}
            className="absolute inset-0 bg-slate-950/25"
            onClick={() => setOpen(false)}
          />
          <section className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[520px] rounded-t-[1.35rem] bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-18px_60px_rgba(15,23,42,0.22)]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />
            <h2 className="mb-3 text-lg font-black text-slate-950">
              {t("gender.title")}
            </h2>
            <div className="grid gap-1.5">
              {OPTIONS.map((option) => {
                const selected = option === value;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      onChange(option);
                      setOpen(false);
                    }}
                    className={`flex min-h-11 items-center justify-between rounded-[0.9rem] px-3 text-left text-sm font-black transition ${
                      selected
                        ? "bg-sky-500 text-white"
                        : "bg-slate-50 text-slate-700"
                    }`}
                  >
                    {t(`gender.${option}`)}
                    {selected && <Check className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
