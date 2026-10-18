"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useAvatar } from "@/hooks/useAvatar";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import { isSupportedLocale } from "@/i18n/config";
import { formatMembershipDuration, memberSinceLabels, profileUi } from "@/i18n/profileUi";
import { localizeGiftPreferences } from "@/i18n/giftPreferenceCategories";
import { formatProfileMemberSince } from "@/lib/profile/profilePresentation";
import { supabase } from "@/lib/supabaseClient";

type SurveyState = { completed: boolean; rewarded: boolean; likes: string[]; dislikes: string[]; dream: string };
const EMPTY_SURVEY: SurveyState = { completed: false, rewarded: false, likes: [], dislikes: [], dream: "" };
const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";

export default function ProfilePage() {
  const router = useRouter();
  const translate = useTranslations("profile");
  const localeValue = useLocale();
  const locale = isSupportedLocale(localeValue) ? localeValue : "pl";
  const copy = profileUi[locale];
  const { user, refreshProfile } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [legacyFullName, setLegacyFullName] = useState("");
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [points, setPoints] = useState(0);
  const [survey, setSurvey] = useState<SurveyState>(EMPTY_SURVEY);
  const [counts, setCounts] = useState({ people: 0, dates: 0, memories: 0 });
  const [editing, setEditing] = useState(false);
  const [draftFirstName, setDraftFirstName] = useState("");
  const [draftLastName, setDraftLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const { url: avatarUrl, refresh: refreshAvatar } = useAvatar(userId);

  const displayName = [firstName, lastName].filter(Boolean).join(" ") || legacyFullName;
  const avatarFallback = firstName?.[0]?.toUpperCase() || legacyFullName?.[0]?.toUpperCase() || "👤";
  const memberSince = createdAt ? formatProfileMemberSince(createdAt, locale) : null;
  const membershipDuration = useMemo(() => {
    if (!createdAt) return null;
    const months = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / (30.44 * 24 * 60 * 60 * 1000)));
    return formatMembershipDuration(locale, months);
  }, [createdAt, locale]);
  const profileChecks = [Boolean(avatarUrl), Boolean(firstName), survey.completed];
  const profilePercent = Math.round(profileChecks.filter(Boolean).length / profileChecks.length * 100);
  const missingProfile = [!avatarUrl && copy.addPhoto, !firstName && copy.addName].filter(Boolean).join(" · ");

  const { state: avatarState, pickAndUpload } = useAvatarUpload({
    userId: userId ?? "",
    onSuccess: (filePath) => {
      setAvatarPath(filePath);
      if (!userId) return;
      void supabase.from("profiles").update({ avatar_url: filePath }).eq("id", userId).then(({ error }) => {
        setMessage(error ? translate("errors.avatarSaveFailed") : translate("states.avatarSaved"));
        refreshAvatar();
      });
    },
    onError: () => setMessage(translate("errors.uploadFailed")),
  });

  useEffect(() => {
    const load = async () => {
      const currentUser = user ?? (await supabase.auth.getUser()).data.user;
      if (!currentUser) { router.replace("/auth/login"); return; }
      setUserId(currentUser.id); setEmail(currentUser.email ?? null); setCreatedAt(currentUser.created_at ?? null);
      const [profileResult, surveyResult, peopleResult, datesResult] = await Promise.all([
        supabase.from("profiles").select("first_name, last_name, full_name, avatar_url, points").eq("id", currentUser.id).maybeSingle(),
        supabase.from("user_survey").select("is_completed, completed_at, reward_granted_at, likes, dislikes, dream").eq("user_id", currentUser.id).maybeSingle(),
        supabase.from("people").select("id", { count: "exact", head: true }).eq("user_id", currentUser.id),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("user_id", currentUser.id),
      ]);
      if (profileResult.error) { setMessage(translate("errors.saveFailed")); return; }
      if (!profileResult.data) {
        const { error } = await supabase.from("profiles").insert({ id: currentUser.id });
        if (error) setMessage(translate("errors.saveFailed"));
      } else {
        setFirstName(clean(profileResult.data.first_name)); setLastName(clean(profileResult.data.last_name)); setLegacyFullName(clean(profileResult.data.full_name));
        setAvatarPath(profileResult.data.avatar_url ?? null); setPoints(profileResult.data.points ?? 0);
      }
      const row = surveyResult.data;
      setSurvey({ completed: Boolean(row?.is_completed && row?.completed_at), rewarded: Boolean(row?.reward_granted_at), likes: Array.isArray(row?.likes) ? row.likes : [], dislikes: Array.isArray(row?.dislikes) ? row.dislikes : [], dream: clean(row?.dream) });
      setCounts({ people: peopleResult.count ?? 0, dates: datesResult.count ?? 0, memories: 0 });
    };
    void load();
  }, [router, translate, user]);

  const openEditor = () => { setDraftFirstName(firstName); setDraftLastName(lastName); setNameError(null); setMessage(null); setEditing(true); };
  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userId) return;
    const canonicalFirstName = draftFirstName.trim(); const canonicalLastName = draftLastName.trim();
    if (!canonicalFirstName) { setNameError(copy.firstNameRequired); return; }
    const canonicalFullName = [canonicalFirstName, canonicalLastName].filter(Boolean).join(" ");
    setSaving(true); setNameError(null);
    const { data, error } = await supabase.from("profiles").update({ first_name: canonicalFirstName, last_name: canonicalLastName || null, full_name: canonicalFullName, avatar_url: avatarPath }).eq("id", userId).select("first_name, last_name, full_name").single();
    setSaving(false);
    if (error || !data) { setMessage(translate("errors.saveFailed")); return; }
    setFirstName(clean(data.first_name)); setLastName(clean(data.last_name)); setLegacyFullName(clean(data.full_name)); setMessage(translate("states.saved")); setEditing(false);
    await refreshProfile(); router.refresh();
  };

  return <main className="safe-container pr-shell" aria-label={translate("accessibility.pageLabel")}>
    <header className="pr-page-intro"><span className="pr-page-intro__eyebrow">HappyDate</span><h1>{translate("title")}</h1></header>
    <section className="pr-hero" aria-labelledby="profile-personal-title">
      <div className="pr-hero__glow" aria-hidden="true" />
      <div className="pr-hero__inner">
        <div className="pr-avatar-wrap">{avatarUrl ? <Image src={avatarUrl} alt={translate("avatar.alt")} width={84} height={84} className="pr-avatar-img" unoptimized /> : <div className="pr-avatar-placeholder">{avatarState.status === "loading" ? "…" : avatarFallback}</div>}<button type="button" className="pr-avatar-edit" aria-label={translate("accessibility.changeAvatar")} onClick={pickAndUpload} disabled={avatarState.status === "loading"}>✏️</button></div>
        <div className="min-w-0 flex-1"><p id="profile-personal-title" className="text-[11px] font-black uppercase tracking-[.15em] text-cyan-700">{copy.personal}</p><h2 className="pr-hero__name">{displayName || copy.defaultName}</h2>{email && <p className="pr-hero__email">{email}</p>}{memberSince && <p className="pr-hero__since">{memberSinceLabels[locale].replace("{date}", memberSince)}</p>}{membershipDuration && <p className="text-xs font-bold text-cyan-700">{copy.together.replace("{duration}", membershipDuration)}</p>}</div>
        <button type="button" className="pr-btn-ghost shrink-0" onClick={openEditor}>✏️ {copy.edit}</button>
      </div>
      <div className="mt-5 border-t border-slate-100 pt-4"><div className="flex items-center justify-between text-xs font-bold text-slate-500"><span>{copy.completeness}</span><span>{profilePercent}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-sky-400" style={{ width: `${profilePercent}%` }} /></div><p className="mt-2 text-xs text-slate-500">{profilePercent === 100 ? copy.complete : missingProfile}</p></div>
    </section>
    {message && <p className="rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm font-bold text-cyan-800" role="status">{message}</p>}
    <div className="grid gap-4 md:grid-cols-2">
      <section className="pr-card"><div className="pr-card__header"><span className="pr-card__icon">🎁</span><p className="pr-card__title">{copy.pointsTitle}</p></div><p className="text-3xl font-black text-slate-950">{points} <span className="text-sm font-bold text-slate-500">{copy.pointsUnit}</span></p><p className="mt-1 text-sm text-slate-500">{copy.pointsHint}</p></section>
      <section className="pr-card"><div className="pr-card__header"><span className="pr-card__icon">{survey.completed ? "✅" : "🫶"}</span><p className="pr-card__title">{copy.surveyTitle}</p></div><p className="font-extrabold text-slate-900">{survey.completed ? copy.surveyDone : copy.surveyPending}</p><p className="mt-1 text-sm text-slate-500">{survey.completed && survey.rewarded ? copy.surveyReward : copy.surveyPendingHint}</p><Link href={survey.completed ? "/survey" : "/onboarding-preview"} className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-cyan-600 px-4 text-sm font-bold text-white hover:bg-cyan-700">{survey.completed ? copy.surveyEdit : copy.surveyStart}</Link></section>
    </div>
    <section className="pr-card border-cyan-100 bg-gradient-to-br from-white to-cyan-50/70"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><span className="pr-card__icon">✨</span><p className="pr-card__title">{copy.socialTitle}</p><span className="rounded-full bg-cyan-100 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-cyan-700">{copy.soon}</span></div><p className="mt-3 text-sm font-bold leading-6 text-slate-800">{copy.socialLead}</p><p className="mt-1 text-sm leading-6 text-slate-600">{copy.socialDescription}</p></div></div><div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-600"><span className="rounded-full bg-white px-3 py-2 shadow-sm">☕ {copy.coffee}</span><span className="rounded-full bg-white px-3 py-2 shadow-sm">🚶 {copy.walk}</span><span className="rounded-full bg-white px-3 py-2 shadow-sm">💬 {copy.talk}</span></div><p className="mt-4 border-t border-cyan-100 pt-3 text-xs font-semibold leading-5 text-slate-500">🔒 {copy.location}</p></section>
    <section className="pr-card"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="pr-card__header"><span className="pr-card__icon">♡</span><p className="pr-card__title">{copy.preferencesTitle}</p></div><p className="text-sm text-slate-500">{copy.preferencesIntro}</p></div><Link href={survey.completed ? "/survey" : "/onboarding-preview"} className="pr-btn-ghost min-h-10 px-4 text-sm">✏️ {survey.completed ? copy.surveyEdit : copy.surveyStart}</Link></div><div className="mt-4 grid gap-3 md:grid-cols-3">{[[copy.likes, localizeGiftPreferences(survey.likes, locale)], [copy.dislikes, localizeGiftPreferences(survey.dislikes, locale)], [copy.dreams, survey.dream ? [survey.dream] : []]].map(([label, values]) => <div key={String(label)} className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{label as string}</p><p className="mt-2 text-sm leading-6 text-slate-700">{(values as string[]).length ? (values as string[]).join(" · ") : copy.empty}</p></div>)}</div></section>
    <section className="pr-card"><div className="pr-card__header"><span className="pr-card__icon">♡</span><p className="pr-card__title">{copy.statsTitle}</p></div><div className="grid grid-cols-3 gap-2 text-center">{[[counts.people, copy.people, "/people"], [counts.dates, copy.dates, "/dashboard"], [counts.memories, copy.memories, "/notes"]].map(([value, label, href]) => <Link href={String(href)} key={String(label)} className="rounded-xl bg-slate-50 p-3 hover:bg-cyan-50"><strong className="block text-xl text-slate-900">{value}</strong><span className="text-xs font-bold text-slate-500">{label}</span></Link>)}</div></section>
    {editing && <div className="fixed inset-0 z-50 grid items-end bg-slate-900/35 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="profile-edit-title"><form onSubmit={saveProfile} className="mx-auto w-full max-w-xl rounded-t-[2rem] bg-white p-5 shadow-2xl sm:rounded-[2rem]"><div className="mb-4 flex items-center justify-between"><h2 id="profile-edit-title" className="text-xl font-extrabold text-slate-900">{copy.edit}</h2><button type="button" className="grid h-11 w-11 place-items-center rounded-full bg-slate-100" onClick={() => setEditing(false)} aria-label={copy.close}>✕</button></div><div className="grid gap-4 sm:grid-cols-2"><label className="pr-field"><span className="pr-field__label">{copy.firstName} *</span><input className="pr-input" value={draftFirstName} onChange={(event) => setDraftFirstName(event.target.value)} autoComplete="given-name" autoFocus /></label><label className="pr-field"><span className="pr-field__label">{copy.lastName}</span><input className="pr-input" value={draftLastName} onChange={(event) => setDraftLastName(event.target.value)} autoComplete="family-name" /></label></div>{nameError && <p className="mt-2 text-sm font-bold text-red-600" role="alert">{nameError}</p>}<button className="pr-btn-primary mt-5 w-full" type="submit" disabled={saving}>{saving ? translate("account.saving") : translate("account.save")}</button></form></div>}
  </main>;
}
