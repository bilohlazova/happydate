"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { MobileUI } from "@/lib/theme/mobile";
import { useTranslations } from "next-intl";

type SpecialDate = {
  id?: string;
  date: string;
  label: string;
  kind: "support" | "celebration";
};

/* Helpers */
function splitTags(s: string): string[] {
  return s
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
}
function joinTags(arr: string[]): string {
  return arr.join(", ");
}
function toYmd(d: string): string | null {
  if (!d) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d; // już OK
  const m = d.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/); // np. 26.09.2025
  if (m) {
    const [, dd, mm, yyyy] = m;
    const pad = (n: string) => n.padStart(2, "0");
    return `${yyyy}-${pad(mm)}-${pad(dd)}`;
  }
  const dt = new Date(d);
  if (isNaN(+dt)) return null;
  return dt.toISOString().slice(0, 10);
}

export default function SurveyPage() {
  const t = useTranslations("static.survey");
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);

  // Stan formularza
  const [likes, setLikes] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState<string[]>([]);
  const [dream, setDream] = useState("");
  const [notes, setNotes] = useState("");
  const [dates, setDates] = useState<SpecialDate[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Guard + preload
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        router.replace("/auth/login?redirectTo=/survey");
        return;
      }
      setUid(user.id);

      // Wczytaj ankietę
      const { data: s } = await supabase
        .from("user_survey")
        .select("likes, dislikes, dream, notes, is_completed")
        .eq("user_id", user.id)
        .maybeSingle();

      if (s) {
        setLikes((s.likes as string[]) ?? []);
        setDislikes((s.dislikes as string[]) ?? []);
        setDream((s.dream as string) ?? "");
        setNotes((s.notes as string) ?? "");
      }

      // Wczytaj szczególne daty
      const { data: ds } = await supabase
        .from("user_special_dates")
        .select("id, date, label, kind")
        .eq("user_id", user.id)
        .order("date", { ascending: true });

      setDates(
        ((ds ?? []) as SpecialDate[]).map((row) => ({
          ...row,
          label: ["support", "celebration", "Trudny dzień", "Święto"].includes(
            row.label
          )
            ? ""
            : row.label,
        }))
      );
      setLoading(false);
    })();
  }, [router]);

  const likesText = useMemo(() => joinTags(likes), [likes]);
  const dislikesText = useMemo(() => joinTags(dislikes), [dislikes]);

  const addEmptyDate = () =>
    setDates((d) => [...d, { date: "", label: "", kind: "support" }]);

  const updateDate = (idx: number, patch: Partial<SpecialDate>) =>
    setDates((d) =>
      d.map((row, i) => (i === idx ? { ...row, ...patch } : row))
    );

  const removeDate = (idx: number) =>
    setDates((d) => d.filter((_, i) => i !== idx));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;

    setSaving(true);
    setMsg(null);
    setErr(null);

    try {
      // Walidacja i normalizacja dat
      const normalizedDates = dates
        .map((d) => {
          const ymd = toYmd(d.date);
          return ymd
            ? {
                user_id: uid,
                date: ymd,
                label: d.label?.trim() || d.kind,
                kind: d.kind,
              }
            : null;
        })
        .filter(
          (
            d
          ): d is {
            user_id: string;
            date: string;
            label: string;
            kind: "support" | "celebration";
          } => d !== null
        );

      // 1) Upsert ankiety
      const { error: sErr } = await supabase.from("user_survey").upsert(
        {
          user_id: uid,
          likes,
          dislikes,
          dream,
          notes,
          is_completed: true,
        },
        { onConflict: "user_id" }
      );
      if (sErr) throw new Error(`user_survey: ${sErr.message}`);

      // 2) Nadpisanie listy dat
      const { error: delErr } = await supabase
        .from("user_special_dates")
        .delete()
        .eq("user_id", uid);
      if (delErr)
        throw new Error(`user_special_dates(delete): ${delErr.message}`);

      if (normalizedDates.length) {
        const { error: insErr } = await supabase
          .from("user_special_dates")
          .insert(normalizedDates);
        if (insErr)
          throw new Error(`user_special_dates(insert): ${insErr.message}`);
      }

      setMsg(t("success"));
      setTimeout(() => router.replace("/profile"), 800);
    } catch (e: unknown) {
      setErr(t("error"));
      console.error("[survey] submit error:", e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main
        className={`${MobileUI.screen} flex items-center justify-center px-4`}
      >
        <p
          className={`${MobileUI.card} p-5 text-sm font-semibold text-gray-500`}
        >
          {t("loading")}
        </p>
      </main>
    );
  }

  return (
    <main className={`survey-care-page ${MobileUI.screen} ${MobileUI.contentBottom} py-4`}>
      <div className={`survey-care-shell ${MobileUI.container} space-y-5 p-4 sm:p-5`}>
        <header className="survey-care-hero">
          <span className="survey-care-hero__eyebrow">{t("eyebrow")}</span>
          <h1>{t("title")}</h1>
          <p>{t("subtitle")}</p>
          <div className="survey-care-trust">
            <span aria-hidden="true">🔒</span>
            <span><strong>{t("privacyTitle")}</strong> {t("privacyBody")}</span>
          </div>
        </header>

        <form onSubmit={submit} className="space-y-6">
          {/* Likes */}
          <div className="survey-care-question">
            <label className="mb-1.5 block text-sm font-bold text-gray-700">
              {t("likes")}
            </label>
            <input
              type="text"
              defaultValue={likesText}
              onChange={(e) => setLikes(splitTags(e.target.value))}
              className={MobileUI.input}
              placeholder={t("likesPlaceholder")}
            />
          </div>

          {/* Dislikes */}
          <div className="survey-care-question">
            <label className="mb-1.5 block text-sm font-bold text-gray-700">
              {t("dislikes")}
            </label>
            <input
              type="text"
              defaultValue={dislikesText}
              onChange={(e) => setDislikes(splitTags(e.target.value))}
              className={MobileUI.input}
              placeholder={t("dislikesPlaceholder")}
            />
          </div>

          {/* Dream */}
          <div className="survey-care-question">
            <label className="mb-1.5 block text-sm font-bold text-gray-700">
              {t("dream")}
            </label>
            <textarea
              value={dream}
              onChange={(e) => setDream(e.target.value)}
              className={`${MobileUI.input} h-auto min-h-24 py-3`}
              rows={3}
              placeholder={t("dreamPlaceholder")}
            />
          </div>

          {/* Notes */}
          <div className="survey-care-question">
            <label className="mb-1.5 block text-sm font-bold text-gray-700">
              {t("notes")}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${MobileUI.input} h-auto min-h-24 py-3`}
              rows={3}
              placeholder={t("notesPlaceholder")}
            />
          </div>

          {/* Special dates */}
          <div className="survey-care-question survey-care-dates">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-sky-600">
                {t("dates")}
              </h2>
              <button
                type="button"
                onClick={addEmptyDate}
                className={`${MobileUI.button} min-h-9 bg-sky-500 px-3 text-white hover:bg-sky-600`}
              >
                + {t("addDate")}
              </button>
            </div>

            {dates.length === 0 && (
              <p className="text-sm text-gray-500">{t("datesEmpty")}</p>
            )}

            <div className="space-y-3">
              {dates.map((d, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 items-center gap-2 rounded-[1rem] border border-slate-200 p-2 sm:grid-cols-4"
                >
                  <input
                    type="date"
                    value={d.date}
                    onChange={(e) => updateDate(i, { date: e.target.value })}
                    className={`${MobileUI.input} col-span-1`}
                  />
                  <select
                    value={d.kind}
                    onChange={(e) =>
                      updateDate(i, {
                        kind: e.target.value as SpecialDate["kind"],
                      })
                    }
                    className={`${MobileUI.input} col-span-1`}
                  >
                    <option value="support">{t("support")}</option>
                    <option value="celebration">{t("celebration")}</option>
                  </select>
                  <input
                    type="text"
                    value={d.label}
                    onChange={(e) => updateDate(i, { label: e.target.value })}
                    className={`${MobileUI.input} col-span-1`}
                    placeholder={t("datePlaceholder")}
                  />
                  <button
                    type="button"
                    onClick={() => removeDate(i)}
                    className={`${MobileUI.button} col-span-1 bg-red-50 text-red-600 hover:bg-red-100`}
                  >
                    {t("remove")}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className={`${MobileUI.button} survey-care-submit w-full text-white disabled:opacity-60`}
            >
              {saving ? t("saving") : t("submit")}
            </button>
          </div>

          {msg && (
            <div className="rounded-[0.95rem] bg-green-100 p-3 text-sm font-semibold text-green-700">
              {msg}
            </div>
          )}
          {err && (
            <div className="rounded-[0.95rem] bg-red-100 p-3 text-sm font-semibold text-red-700">
              {err}
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
