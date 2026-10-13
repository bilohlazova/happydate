"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { occasionCountryCopy } from "@/lib/occasions/occasionUi";

export function OccasionCountrySettings() {
  const locale = useLocale() as keyof typeof occasionCountryCopy;
  const copy = occasionCountryCopy[locale] ?? occasionCountryCopy.en;
  const [countryCode, setCountryCode] = useState<"PL" | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  useEffect(() => { void fetch("/api/happy/preferences/occasion-country").then((response) => response.ok ? response.json() : null).then((value) => { if (value?.countryCode === "PL" || value?.countryCode === null) setCountryCode(value.countryCode); }); }, []);
  const save = async (next: "PL" | null) => {
    setSaving(true); setStatus("idle");
    try {
      const response = await fetch("/api/happy/preferences/occasion-country", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ countryCode: next }) });
      if (!response.ok) throw new Error("save");
      const value = await response.json();
      if (value.countryCode !== next) throw new Error("confirmation");
      setCountryCode(value.countryCode); setStatus("saved");
    } catch { setStatus("error"); } finally { setSaving(false); }
  };
  return <section aria-label={copy.title} className="hd-settings-section"><h2 className="hd-settings-section__title">{copy.title}</h2><p className="hd-settings-section__description">{copy.description}</p><div className="space-y-2"><button type="button" disabled={saving} onClick={() => void save(null)} aria-pressed={countryCode === null} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 p-4 text-left disabled:opacity-60"><span className="h-3 w-3 rounded-full border-2 border-cyan-600">{countryCode === null && <span className="block h-full w-full rounded-full bg-cyan-600" />}</span><span>{copy.unset}</span></button><button type="button" disabled={saving} onClick={() => void save("PL")} aria-pressed={countryCode === "PL"} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 p-4 text-left disabled:opacity-60"><span className="h-3 w-3 rounded-full border-2 border-cyan-600">{countryCode === "PL" && <span className="block h-full w-full rounded-full bg-cyan-600" />}</span><span>{copy.poland}</span></button></div>{status === "saved" && <p className="mt-3 text-sm text-emerald-700">{copy.saved}</p>}{status === "error" && <p className="mt-3 text-sm text-rose-700">{copy.error}</p>}</section>;
}
