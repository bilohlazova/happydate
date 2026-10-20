"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";

const COPY = {
  uk: { title: "Коли Happy може підказувати", description: "Оберіть, наскільки проактивно Happy може нагадувати про важливе.", minimal: "Лише найважливіша й термінова допомога", balanced: "Корисні нагадування без зайвих переривань", active: "Happy може допомагати раніше й частіше", saved: "Збережено", error: "Не вдалося зберегти налаштування." },
  pl: { title: "Kiedy Happy może podpowiadać", description: "Wybierz, jak proaktywnie Happy może przypominać o ważnych sprawach.", minimal: "Tylko najważniejsza i pilna pomoc", balanced: "Przydatne przypomnienia bez zbędnych przerw", active: "Happy może pomagać wcześniej i częściej", saved: "Zapisano", error: "Nie udało się zapisać ustawień." },
  en: { title: "When Happy can reach out", description: "Choose how proactively Happy may remind you about important things.", minimal: "Only the most important and time-sensitive help", balanced: "Useful reminders without too many interruptions", active: "Happy can help earlier and more often", saved: "Saved", error: "Could not save settings." },
  de: { title: "Wann Happy sich melden darf", description: "Wähle, wie proaktiv Happy an Wichtiges erinnern darf.", minimal: "Nur besonders wichtige und dringende Hilfe", balanced: "Nützliche Erinnerungen ohne zu viele Unterbrechungen", active: "Happy darf früher und öfter helfen", saved: "Gespeichert", error: "Einstellungen konnten nicht gespeichert werden." },
  ru: { title: "Когда Happy может подсказать", description: "Выберите, насколько активно Happy может напоминать о важном.", minimal: "Только самая важная и срочная помощь", balanced: "Полезные напоминания без лишних перерывов", active: "Happy может помогать раньше и чаще", saved: "Сохранено", error: "Не удалось сохранить настройки." },
} as const;

export function ProactivitySettings() {
  const locale = useLocale() as keyof typeof COPY;
  const copy = COPY[locale] ?? COPY.en;
  const [mode, setMode] = useState<"minimal" | "balanced" | "active">("balanced");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  useEffect(() => { void fetch("/api/happy/preferences/proactivity").then((response) => response.ok ? response.json() : null).then((value) => { if (value?.mode === "minimal" || value?.mode === "balanced" || value?.mode === "active") setMode(value.mode); }); }, []);
  const save = async (next: typeof mode) => {
    setSaving(true); setStatus("idle");
    try { const response = await fetch("/api/happy/preferences/proactivity", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: next }) }); if (!response.ok) throw new Error("save"); const value = await response.json(); if (value.mode !== next) throw new Error("confirmation"); setMode(value.mode); setStatus("saved"); } catch { setStatus("error"); } finally { setSaving(false); }
  };
  return <section aria-label={copy.title} className="hd-settings-section"><h2 className="hd-settings-section__title">{copy.title}</h2><p className="hd-settings-section__description">{copy.description}</p><div className="space-y-2">{(["minimal", "balanced", "active"] as const).map((value) => <button key={value} type="button" disabled={saving} onClick={() => void save(value)} aria-pressed={mode === value} className="flex w-full items-start gap-3 rounded-2xl border border-slate-200 p-4 text-left disabled:opacity-60"><span className="mt-1 h-3 w-3 rounded-full border-2 border-cyan-600">{mode === value && <span className="block h-full w-full rounded-full bg-cyan-600" />}</span><span><strong className="block capitalize">{value}</strong><span className="text-sm text-slate-500">{copy[value]}</span></span></button>)}</div>{status === "saved" && <p className="mt-3 text-sm text-emerald-700">{copy.saved}</p>}{status === "error" && <p className="mt-3 text-sm text-rose-700">{copy.error}</p>}</section>;
}
