"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";

import {
  getRelationCategoryForLabel,
  RELATION_OPTIONS,
  type RelationCategory,
} from "@/components/people/peopleRelations";

interface RelationPickerFieldProps {
  value: string;
  onChange: (value: string, category: RelationCategory | null) => void;
}

export function RelationPickerField({
  value,
  onChange,
}: RelationPickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [customOpen, setCustomOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setCustomValue(value);
      setCustomOpen(false);
    }
  }, [open, value]);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-black text-slate-600">Relacja</label>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex min-h-11 items-center justify-between rounded-[0.95rem] border border-slate-100 bg-white px-4 text-left text-[16px] font-semibold shadow-[0_8px_22px_rgba(15,23,42,0.05)] ${
          value ? "text-slate-800" : "text-slate-400"
        }`}
      >
        <span>{value || "Wybierz relację"}</span>
        <span className="text-xs font-black text-sky-600">Zmień</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Zamknij wybór relacji"
            className="absolute inset-0 bg-slate-950/25"
            onClick={() => setOpen(false)}
          />
          <section className="absolute inset-x-0 bottom-0 mx-auto max-h-[78dvh] w-full max-w-[520px] overflow-y-auto rounded-t-[1.35rem] bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-18px_60px_rgba(15,23,42,0.22)]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-950">
                Wybierz relację
              </h2>
              <button
                type="button"
                onClick={() => {
                  onChange("", null);
                  setOpen(false);
                }}
                className="text-sm font-black text-slate-400"
              >
                Wyczyść
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {RELATION_OPTIONS.map((option) => {
                const selected = value === option.label;
                const isCustomOption = option.label === "Inne";

                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => {
                      if (isCustomOption) {
                        setCustomOpen(true);
                        return;
                      }

                      onChange(option.label, option.category);
                      setOpen(false);
                    }}
                    className={`flex min-h-10 items-center justify-between rounded-[0.85rem] px-3 text-sm font-black transition ${
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

            {customOpen && (
              <div className="mt-3 rounded-[1rem] bg-slate-50 p-3">
                <label className="text-xs font-black text-slate-600">
                  Wpisz własną relację
                </label>
                <input
                  value={customValue}
                  onChange={(event) => setCustomValue(event.target.value)}
                  className="mt-1 h-11 w-full rounded-[0.9rem] border border-slate-100 bg-white px-3 text-[16px] font-semibold text-slate-800 outline-none focus:border-sky-200 focus:ring-4 focus:ring-sky-100"
                  placeholder="np. Trener, Fryzjerka, Opiekunka"
                  autoFocus
                />
                <button
                  type="button"
                  disabled={!customValue.trim()}
                  onClick={() => {
                    const nextValue = customValue.trim();

                    onChange(nextValue, getRelationCategoryForLabel(nextValue));
                    setOpen(false);
                  }}
                  className="mt-2 min-h-10 w-full rounded-[0.9rem] bg-gradient-to-r from-sky-500 to-cyan-500 px-4 text-sm font-black text-white disabled:opacity-50"
                >
                  Użyj tej relacji
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
