"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { MobileUI } from "@/lib/theme/mobile";
import { useLocale, useTranslations } from "next-intl";
import { logOperationalError } from "@/lib/observability/safeLogger";
import { isSupportedLocale } from "@/i18n/config";
import { canonicalizeGiftPreference, localizeGiftPreferences } from "@/i18n/giftPreferenceCategories";

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
export default function SurveyPage() {
  const t = useTranslations("static.survey");
  const localeValue = useLocale();
  const locale = isSupportedLocale(localeValue) ? localeValue : "pl";
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);

  // Stan formularza
  const [likes, setLikes] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState<string[]>([]);
  const [dream, setDream] = useState("");
  const [notes, setNotes] = useState("");

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
        .select("likes, dislikes, dream, notes")
        .eq("user_id", user.id)
        .maybeSingle();

      if (s) {
        setLikes((s.likes as string[]) ?? []);
        setDislikes((s.dislikes as string[]) ?? []);
        setDream((s.dream as string) ?? "");
        setNotes((s.notes as string) ?? "");
      }

      setLoading(false);
    })();
  }, [router]);

  const likesText = useMemo(() => joinTags(localizeGiftPreferences(likes, locale)), [likes, locale]);
  const dislikesText = useMemo(() => joinTags(localizeGiftPreferences(dislikes, locale)), [dislikes, locale]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;

    setSaving(true);
    setMsg(null);
    setErr(null);

    try {
      // NULL tells the RPC that this legacy page does not edit survey events.
      const { error: sErr } = await supabase.rpc("save_my_onboarding_survey", {
        p_likes: likes,
        p_dislikes: dislikes,
        p_dream: dream,
        p_notes: notes,
        p_special_dates: null,
      });
      if (sErr) throw new Error(`save_my_onboarding_survey: ${sErr.message}`);

      setMsg(t("success"));
      setTimeout(() => router.replace("/profile"), 800);
    } catch (e: unknown) {
      setErr(t("error"));
      logOperationalError("survey", "submit-failed", e);
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
              value={likesText}
              onChange={(e) => setLikes(splitTags(e.target.value).map((value) => canonicalizeGiftPreference(value, locale)))}
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
              value={dislikesText}
              onChange={(e) => setDislikes(splitTags(e.target.value).map((value) => canonicalizeGiftPreference(value, locale)))}
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
