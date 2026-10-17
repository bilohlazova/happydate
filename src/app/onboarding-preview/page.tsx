"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabaseClient";
import { MobileUI } from "@/lib/theme/mobile";

type Step = "welcome" | "birthday" | "likes" | "dislikes" | "dreams" | "complete";
type CustomValue = { id: string; value: string };

const CATEGORY_IDS = [
  "flowers", "books", "travel", "experiences", "technology", "cosmetics",
  "sweets", "jewelry", "clothes", "games", "sport", "home",
] as const;

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function TagList({
  values,
  onEdit,
  onRemove,
  editLabel,
  removeLabel,
}: {
  values: CustomValue[];
  onEdit: (item: CustomValue) => void;
  onRemove: (id: string) => void;
  editLabel: string;
  removeLabel: string;
}) {
  if (!values.length) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {values.map((item) => (
        <li key={item.id} className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-3 py-1.5 text-sm font-semibold text-cyan-800">
          <span>{item.value}</span>
          <button type="button" onClick={() => onEdit(item)} className="rounded px-1 text-xs underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-700" aria-label={`${editLabel}: ${item.value}`}>{editLabel}</button>
          <button type="button" onClick={() => onRemove(item.id)} className="rounded px-1 text-xs text-cyan-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-700" aria-label={`${removeLabel}: ${item.value}`}>×</button>
        </li>
      ))}
    </ul>
  );
}

export default function OnboardingPreviewPage() {
  const t = useTranslations("onboarding");
  const text = t as unknown as (key: string, values?: Record<string, string | number>) => string;
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [pointsAwarded, setPointsAwarded] = useState<number | null>(null);
  const [profileName, setProfileName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [birthdayError, setBirthdayError] = useState(false);
  const [likes, setLikes] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState<string[]>([]);
  const [likeCustom, setLikeCustom] = useState<CustomValue[]>([]);
  const [dislikeCustom, setDislikeCustom] = useState<CustomValue[]>([]);
  const [likeDraft, setLikeDraft] = useState("");
  const [dislikeDraft, setDislikeDraft] = useState("");
  const [editingLikeId, setEditingLikeId] = useState<string | null>(null);
  const [editingDislikeId, setEditingDislikeId] = useState<string | null>(null);
  const [dreams, setDreams] = useState<CustomValue[]>([]);
  const [dreamDraft, setDreamDraft] = useState("");
  const [editingDreamId, setEditingDreamId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.replace("/auth/login?redirectTo=/onboarding-preview");
        return;
      }
      const [{ data: profile }, { data: survey }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", auth.user.id).maybeSingle(),
        supabase.from("user_survey").select("is_completed").eq("user_id", auth.user.id).maybeSingle(),
      ]);
      if (survey?.is_completed) {
        router.replace("/");
        return;
      }
      if (active) {
        setProfileName(typeof profile?.full_name === "string" ? profile.full_name.trim() : "");
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [router]);

  const steps = useMemo<Step[]>(() => ["welcome", "birthday", "likes", "dislikes", "dreams", "complete"], []);
  const currentIndex = Math.max(0, steps.indexOf(step));
  const next = () => setStep(steps[Math.min(currentIndex + 1, steps.length - 1)]);
  const back = () => setStep(steps[Math.max(currentIndex - 1, 0)]);
  const toggleCategory = (kind: "likes" | "dislikes", id: string) => {
    const setter = kind === "likes" ? setLikes : setDislikes;
    setter((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };
  const addCustom = (kind: "likes" | "dislikes") => {
    const draft = kind === "likes" ? likeDraft.trim() : dislikeDraft.trim();
    if (!draft) return;
    const values = kind === "likes" ? likeCustom : dislikeCustom;
    const editingId = kind === "likes" ? editingLikeId : editingDislikeId;
    const duplicate = values.some((item) => item.id !== editingId && item.value.localeCompare(draft, undefined, { sensitivity: "accent" }) === 0);
    if (duplicate) return;
    const setter = kind === "likes" ? setLikeCustom : setDislikeCustom;
    setter((current) => editingId ? current.map((item) => item.id === editingId ? { ...item, value: draft } : item) : [...current, { id: `${kind}-${Date.now()}`, value: draft }]);
    if (kind === "likes") { setLikeDraft(""); setEditingLikeId(null); } else { setDislikeDraft(""); setEditingDislikeId(null); }
  };
  const addDream = () => {
    const draft = dreamDraft.trim();
    if (!draft) return;
    const duplicate = dreams.some((item) => item.id !== editingDreamId && item.value.localeCompare(draft, undefined, { sensitivity: "accent" }) === 0);
    if (duplicate) return;
    setDreams((current) => editingDreamId ? current.map((item) => item.id === editingDreamId ? { ...item, value: draft } : item) : [...current, { id: `dream-${Date.now()}`, value: draft }]);
    setDreamDraft("");
    setEditingDreamId(null);
  };
  const submitOnboarding = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError(false);
    const { data, error } = await supabase.rpc("save_my_onboarding_survey", {
      p_likes: [...likes, ...likeCustom.map((item) => item.value)],
      p_dislikes: [...dislikes, ...dislikeCustom.map((item) => item.value)],
      p_dream: dreams.map((item) => item.value).join("\n"),
      p_notes: "",
      // The preview does not edit legacy calendar events; the RPC preserves them.
      p_special_dates: null,
    });
    if (error) {
      setSaveError(true);
      setSaving(false);
      return;
    }
    const awarded = Array.isArray(data) && typeof data[0]?.points_awarded === "number" ? data[0].points_awarded : 0;
    setPointsAwarded(awarded);
    setSaving(false);
    setStep("complete");
  };
  const summaryCount = likes.length + dislikes.length + likeCustom.length + dislikeCustom.length + dreams.length + (birthday ? 1 : 0);

  if (loading) return <main className={`${MobileUI.screen} flex min-h-[60vh] items-center justify-center px-4`}><p className={`${MobileUI.card} p-5 text-sm font-semibold text-slate-500`} role="status">{t("eyebrow")}</p></main>;

  return (
    <main className={`${MobileUI.screen} pb-[calc(2rem+env(safe-area-inset-bottom))]`}>
      <div className="mx-auto w-full max-w-2xl px-3 py-4 sm:px-5 sm:py-8">
        <div className="mb-3 flex items-center justify-between gap-3 px-1 text-xs font-bold uppercase tracking-[0.12em] text-sky-700">
          <span>{t("eyebrow")}</span>
          <span aria-live="polite">{t("progress", { current: currentIndex + 1, total: steps.length })}</span>
        </div>
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={currentIndex + 1}>
          <div className="h-full rounded-full bg-cyan-500 transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }} />
        </div>
        <section className={`${MobileUI.card} p-4 sm:p-7`} aria-labelledby="onboarding-title">
          {step === "welcome" && <>
            <h1 id="onboarding-title" className="text-2xl font-black leading-tight text-slate-950 sm:text-3xl">{profileName ? t("welcome.known", { name: profileName }) : t("welcome.unknown")}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">{t("welcome.body")}</p>
            <div className="mt-5 rounded-2xl bg-cyan-50 p-4 text-cyan-950"><p className="font-bold">{t("welcome.rewardTitle")}</p><p className="mt-1 text-sm leading-5 text-cyan-800">{t("welcome.rewardBody")}</p></div>
          </>}
          {step === "birthday" && <>
            <h1 id="onboarding-title" className="text-2xl font-black leading-tight text-slate-950 sm:text-3xl">{t("birthday.title")}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">{t("birthday.body")}</p>
            <label className="mt-6 block text-sm font-bold text-slate-700" htmlFor="onboarding-birthday">{t("birthday.label")}</label>
            <input id="onboarding-birthday" type="date" value={birthday} onChange={(event) => { setBirthday(event.target.value); setBirthdayError(false); }} className={`${MobileUI.input} mt-1.5`} aria-invalid={birthdayError} />
            {birthdayError && <p className="mt-2 text-sm font-semibold text-rose-700" role="alert">{t("birthday.invalid")}</p>}
          </>}
          {(step === "likes" || step === "dislikes") && (() => {
            const kind = step === "likes" ? "likes" : "dislikes";
            const selected = kind === "likes" ? likes : dislikes;
            const custom = kind === "likes" ? likeCustom : dislikeCustom;
            const draft = kind === "likes" ? likeDraft : dislikeDraft;
            const setDraft = kind === "likes" ? setLikeDraft : setDislikeDraft;
            const editingId = kind === "likes" ? editingLikeId : editingDislikeId;
            const setEditing = kind === "likes" ? setEditingLikeId : setEditingDislikeId;
            return <>
              <h1 id="onboarding-title" className="text-2xl font-black leading-tight text-slate-950 sm:text-3xl">{text(`${kind}.title`)}</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">{text(`${kind}.body`)}</p>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {CATEGORY_IDS.map((id) => <button key={id} type="button" aria-pressed={selected.includes(id)} onClick={() => toggleCategory(kind, id)} className={`min-h-12 rounded-2xl border px-3 py-2 text-sm font-bold transition motion-reduce:transition-none ${selected.includes(id) ? "border-cyan-500 bg-cyan-50 text-cyan-900 ring-2 ring-cyan-100" : "border-slate-200 bg-white text-slate-700 hover:border-cyan-300"}`}>{text(`categories.${id}`)}</button>)}
              </div>
              {kind === "dislikes" && likes.some((id) => dislikes.includes(id)) && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm leading-5 text-amber-900" role="status">{t("dislikes.conflict")}</p>}
              <label className="mt-5 block text-sm font-bold text-slate-700" htmlFor={`onboarding-${kind}-custom`}>{text(`${kind}.customLabel`)}</label>
              <div className="mt-1.5 flex gap-2"><input id={`onboarding-${kind}-custom`} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCustom(kind); } }} className={`${MobileUI.input} min-w-0 flex-1`} placeholder={text(`${kind}.customPlaceholder`)} /><button type="button" onClick={() => addCustom(kind)} className={`${MobileUI.button} shrink-0 bg-cyan-600 text-white hover:bg-cyan-700`}>{editingId ? t("edit") : t("add")}</button></div>
              <TagList values={custom} onEdit={(item) => { setDraft(item.value); setEditing(item.id); }} onRemove={(id) => { if (kind === "likes") setLikeCustom((current) => current.filter((item) => item.id !== id)); else setDislikeCustom((current) => current.filter((item) => item.id !== id)); }} editLabel={t("edit")} removeLabel={t("remove")} />
            </>;
          })()}
          {step === "dreams" && <>
            <h1 id="onboarding-title" className="text-2xl font-black leading-tight text-slate-950 sm:text-3xl">{t("dreams.title")}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">{t("dreams.body")}</p>
            <label className="mt-5 block text-sm font-bold text-slate-700" htmlFor="onboarding-dream">{t("dreams.label")}</label>
            <div className="mt-1.5 flex gap-2"><textarea id="onboarding-dream" value={dreamDraft} onChange={(event) => setDreamDraft(event.target.value)} className={`${MobileUI.input} min-w-0 flex-1 h-auto min-h-20 py-3`} placeholder={t("dreams.placeholder")} /><button type="button" onClick={addDream} className={`${MobileUI.button} shrink-0 self-end bg-cyan-600 text-white hover:bg-cyan-700`}>{editingDreamId ? t("edit") : t("add")}</button></div>
            <TagList values={dreams} onEdit={(item) => { setDreamDraft(item.value); setEditingDreamId(item.id); }} onRemove={(id) => setDreams((current) => current.filter((item) => item.id !== id))} editLabel={t("edit")} removeLabel={t("remove")} />
          </>}
          {step === "complete" && <>
            <h1 id="onboarding-title" className="text-2xl font-black leading-tight text-slate-950 sm:text-3xl">{t("complete.title")}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">{t("complete.body")}</p>
            <div className="mt-5 rounded-2xl bg-slate-50 p-4"><h2 className="font-bold text-slate-900">{t("complete.summary")}</h2><p className="mt-1 text-sm text-slate-600">{summaryCount ? `${summaryCount}` : t("complete.empty")}</p><div className="mt-3 flex flex-wrap gap-2">{steps.slice(1, -1).map((item, index) => <button key={item} type="button" onClick={() => setStep(item)} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-cyan-700 ring-1 ring-slate-200">{t("complete.editStep")} {index + 2}</button>)}</div></div>
            <div className="mt-4 rounded-2xl bg-cyan-50 p-4"><p className="font-black text-cyan-950">{t("complete.reward")}</p><p className="mt-1 text-sm text-cyan-800">{pointsAwarded === null ? t("complete.pending") : `+${pointsAwarded}`}</p></div>
            {saveError && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800" role="alert">{t("saveError")}</p>}
          </>}
          {saveError && step !== "complete" && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800" role="alert">{t("saveError")}</p>}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            {currentIndex > 0 ? <button type="button" onClick={back} className={`${MobileUI.button} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}>{t("back")}</button> : <span />}
            {step === "welcome" && <div className="flex flex-col gap-2 sm:flex-row"><button type="button" onClick={() => router.replace("/")} className={`${MobileUI.button} border border-slate-200 bg-white text-slate-700`}>{t("welcome.later")}</button><button type="button" onClick={next} className={`${MobileUI.button} bg-cyan-600 text-white hover:bg-cyan-700`}>{t("welcome.start")}</button></div>}
            {step === "birthday" && <div className="flex flex-col gap-2 sm:flex-row"><button type="button" onClick={() => { setBirthday(""); next(); }} className={`${MobileUI.button} border border-slate-200 bg-white text-slate-700`}>{t("birthday.skip")}</button><button type="button" onClick={() => { if (birthday && !validDate(birthday)) { setBirthdayError(true); return; } next(); }} className={`${MobileUI.button} bg-cyan-600 text-white hover:bg-cyan-700`}>{t("continue")}</button></div>}
            {(step === "likes" || step === "dislikes") && <div className="flex flex-col gap-2 sm:flex-row"><button type="button" onClick={next} className={`${MobileUI.button} border border-slate-200 bg-white text-slate-700`}>{t("skip")}</button><button type="button" onClick={next} className={`${MobileUI.button} bg-cyan-600 text-white hover:bg-cyan-700`}>{t("continue")}</button></div>}
            {step === "dreams" && <div className="flex flex-col gap-2 sm:flex-row"><button type="button" onClick={submitOnboarding} className={`${MobileUI.button} border border-slate-200 bg-white text-slate-700`} disabled={saving}>{t("skip")}</button><button type="button" onClick={submitOnboarding} className={`${MobileUI.button} bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-60`} disabled={saving}>{saving ? t("saving") : t("continue")}</button></div>}
            {step === "complete" && <button type="button" onClick={() => router.replace("/profile")} className={`${MobileUI.button} bg-cyan-600 text-white hover:bg-cyan-700`}>{t("complete.finish")}</button>}
          </div>
        </section>
      </div>
    </main>
  );
}
