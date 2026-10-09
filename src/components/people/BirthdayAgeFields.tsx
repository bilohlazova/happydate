"use client";

import { useEffect, useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { birthdayAgeLabels } from "@/lib/birthday/birthdayAgeLabels";
import { confirmedBirthdayYear, resolveBirthdayAgeInput, type BirthdayAgeInput } from "@/lib/birthday/birthdayAgeInput";
import { birthYearFromFullBirthday } from "@/lib/birthday/birthdayAge";
import { assistantLocalDate } from "@/lib/assistant/assistantLocalDate";
import { getReminderPreferences } from "@/lib/repositories/reminders/reminderPreferences.repository";
import { MobileUI } from "@/lib/theme/mobile";

/** Both editors share this temporary inference state. Only explicit confirmation
 * calls onBirthYearChange; persistence remains the enclosing form's normal save. */
export function BirthdayAgeFields({ birthday, birthYear, onBirthYearChange }: {
  birthday: string; birthYear: string; onBirthYearChange: (year: string) => void;
}) {
  const id = useId();
  const labels = birthdayAgeLabels(useLocale());
  const t = useTranslations("personForm.ageIntelligence");
  const [mode, setMode] = useState<BirthdayAgeInput["type"]>("current_age");
  const [age, setAge] = useState("");
  const [timezone, setTimezone] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const birthdayYear = birthYearFromFullBirthday(birthday);
  const yearKnown = birthdayYear !== null || /^\d{4}$/.test(birthYear);
  useEffect(() => {
    if (yearKnown) return;
    let active = true;
    getReminderPreferences().then((preferences) => { if (active) setTimezone(preferences.timezone); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [yearKnown]);
  const today = timezone ? assistantLocalDate(new Date(), timezone) : null;
  const input: BirthdayAgeInput = { type: mode, age: Number(age) };
  const suggestion = age.trim() && today ? resolveBirthdayAgeInput(input, birthday, birthYear, today) : null;
  const candidate = suggestion?.kind === "exact" ? suggestion.birthYear
    : suggestion?.kind === "conflict" ? suggestion.inferredBirthYear : null;
  // A confirmed year is profile information, not edit-form guidance. The date
  // field above remains the sole birthday control once it is known.
  if (yearKnown) return null;

  return <div className="space-y-3">
    <label className="block text-sm font-semibold" htmlFor={id}>{labels.birthYear}</label>
    <input id={id} type="number" min="1" step="1" max={today ? Number(today.slice(0, 4)) : undefined} value={birthYear}
      onChange={(event) => onBirthYearChange(event.target.value)} className={MobileUI.input} />
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-slate-600">{t("help")}</legend>
      <div className="flex flex-wrap gap-4">{(["current_age", "turning_age"] as const).map((type) =>
        <label key={type} className="flex items-center gap-2 text-sm"><input type="radio" name={id + "-mode"} checked={mode === type}
          onChange={() => setMode(type)} />{t(type === "current_age" ? "current" : "turning")}</label>)}</div>
      <label htmlFor={id + "-age"} className="sr-only">{t(mode === "current_age" ? "current" : "turning")}</label>
      <input id={id + "-age"} type="number" min="0" max="130" step="1" value={age} onChange={(event) => setAge(event.target.value)} className={MobileUI.input} />
      {!today && <p className="text-sm text-slate-500">{t(failed ? "failed" : "loading")}</p>}
      <div aria-live="polite" className="text-sm text-slate-700">
        {suggestion?.kind === "exact" && <p>{t("exact", { year: suggestion.birthYear })}</p>}
        {suggestion?.kind === "ambiguous" && <p>{t("ambiguous", { first: suggestion.possibleBirthYears[0], second: suggestion.possibleBirthYears[1] })}</p>}
        {suggestion?.kind === "conflict" && <p>{t("conflict", { existing: suggestion.existingBirthYear, candidate: suggestion.inferredBirthYear })}</p>}
        {suggestion?.kind === "match" && <p>{t("match", { year: suggestion.birthYear })}</p>}
        {(suggestion?.kind === "invalid" || suggestion?.kind === "unavailable") && <p>{t(suggestion.kind)}</p>}
      </div>
      {candidate !== null && suggestion && <button type="button" className="rounded-lg bg-sky-600 px-3 py-2 text-white"
        onClick={() => onBirthYearChange(confirmedBirthdayYear(birthYear, suggestion, "confirm"))}>{labels.add(candidate)}</button>}
      {age !== "" && <button type="button" className="ml-2 rounded-lg px-3 py-2 text-slate-700" onClick={() => setAge("")}>{labels.notNow}</button>}
    </fieldset>
  </div>;
}
