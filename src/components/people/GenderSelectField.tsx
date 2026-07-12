"use client";

import { Check } from "lucide-react";
import { useState } from "react";

import type { PersonGender } from "@/lib/repositories/person.types";

interface GenderSelectFieldProps {
  value: PersonGender;
  onChange: (value: PersonGender) => void;
}

const OPTIONS: Array<{ value: PersonGender; label: string }> = [
  { value: "female", label: "Kobieta" },
  { value: "male", label: "Mężczyzna" },
  { value: "other", label: "Inna" },
  { value: "unspecified", label: "Wolę nie podawać" },
];

const CLOSED_LABELS: Record<PersonGender, string> = {
  female: "Kobieta",
  male: "Mężczyzna",
  other: "Inna",
  unspecified: "Nie podano",
};

export function GenderSelectField({ value, onChange }: GenderSelectFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-black text-slate-600">Płeć</label>
        <span className="text-[0.65rem] font-bold text-slate-400">
          Opcjonalnie
        </span>
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 items-center justify-between rounded-[0.95rem] border border-slate-100 bg-white px-4 text-left text-[16px] font-semibold text-slate-800 shadow-[0_8px_22px_rgba(15,23,42,0.05)]"
      >
        <span>{CLOSED_LABELS[value] ?? "Wybierz płeć"}</span>
        <span className="text-xs font-black text-sky-600">Zmień</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[130]">
          <button
            type="button"
            aria-label="Zamknij wybór płci"
            className="absolute inset-0 bg-slate-950/25"
            onClick={() => setOpen(false)}
          />
          <section className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[520px] rounded-t-[1.35rem] bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-18px_60px_rgba(15,23,42,0.22)]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />
            <h2 className="mb-3 text-lg font-black text-slate-950">
              Wybierz płeć
            </h2>
            <div className="grid gap-1.5">
              {OPTIONS.map((option) => {
                const selected = option.value === value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={`flex min-h-11 items-center justify-between rounded-[0.9rem] px-3 text-left text-sm font-black transition ${
                      selected
                        ? "bg-sky-500 text-white"
                        : "bg-slate-50 text-slate-700"
                    }`}
                  >
                    {option.label}
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
