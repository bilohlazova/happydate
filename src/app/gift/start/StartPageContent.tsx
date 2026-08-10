"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  GiftDiscoveryPanel,
  type GiftDiscoveryAnswerValue,
} from "@/components/gift/GiftDiscoveryPanel";
import { GiftRecommendationCard } from "@/components/gift/GiftRecommendationCard";
import { HappyLearningCard } from "@/components/memory/HappyLearningCard";
import { ComingSoonNotice } from "@/components/ui/ComingSoonNotice";
import type {
  GiftDiscoveryAnswers,
  GiftDiscoveryQuestion,
  GiftDiscoveryQuestionType,
} from "@/lib/gift-discovery";
import type { HappyLearningDetectionCandidate } from "@/lib/happy-learning/happyLearningDetectV2.types";
import { confirmHappyLearningCandidateWithSession } from "@/lib/happy-learning/happyLearningClient";
import { createPersonGiftIdea, loadGiftWorkspace } from "@/lib/gifts/gift.loaders";
import type { GiftWorkspaceViewModel } from "@/lib/gifts/gift.types";
import {
  requestGiftRecommendations,
  type GiftRecommendationsResult,
} from "@/lib/gifts/giftRecommendationClient";
import { submitLegacyGiftRequest } from "@/lib/gifts/giftRequestCompatibility";
import { MobileUI } from "@/lib/theme/mobile";
import { GiftWorkspacePanel } from "./GiftWorkspacePanel";

type FormState = {
  eventId: string | null;
  eventTitle: string;
  eventDate: string | null;
  forWhom: string;
  gender: string;
  age: string;
  interests: string;
  occasion: string;
  budget: number;
  anonymity: boolean;
  splitPayment: boolean;
  delivery: "kurier" | "paczkomat" | "osobiscie";
  notes: string;
};

type RecommendationState =
  | { status: "idle" }
  | { status: "loading" }
  | Extract<GiftRecommendationsResult, { ok: true }> & { status: "success" }
  | { status: "error"; error: Exclude<GiftRecommendationsResult, { ok: true }>["error"] };

function formatDate(ymd: string | null | undefined, locale: string) {
  if (!ymd) return "";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
    new Date((ymd as string) + "T00:00:00")
  );
}

export default function GiftStartPage({
  workspace,
  workspaceError,
}: {
  workspace: GiftWorkspaceViewModel | null;
  workspaceError: boolean;
}) {
  const sp = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("gift");
  const memoryT = useTranslations("memoryCapture");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ key: "saveError" | "success" | "error"; success: boolean } | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationState>({ status: "idle" });
  const [recommendationPending, setRecommendationPending] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const [savingSuggestionKey, setSavingSuggestionKey] = useState<string | null>(null);
  const [savedSuggestionKeys, setSavedSuggestionKeys] = useState<string[]>([]);
  const [suggestionSaveErrorKey, setSuggestionSaveErrorKey] = useState<string | null>(null);
  const [liveWorkspace, setLiveWorkspace] = useState<GiftWorkspaceViewModel | null>(workspace);
  const [workspaceRefreshFailed, setWorkspaceRefreshFailed] = useState(false);
  const [discoveryAnswers, setDiscoveryAnswers] = useState<GiftDiscoveryAnswers>({});
  const [skippedDiscoveryQuestions, setSkippedDiscoveryQuestions] = useState<string[]>([]);
  const [dismissedMemoryCandidateIds, setDismissedMemoryCandidateIds] = useState<string[]>([]);
  const [savedMemoryCandidateIds, setSavedMemoryCandidateIds] = useState<string[]>([]);
  const [memoryCaptureStatus, setMemoryCaptureStatus] = useState<{
    kind: "saved" | "alreadySaved" | "saveFailed";
    candidateId: string;
  } | null>(null);
  const [memoryCaptureRetryNonce, setMemoryCaptureRetryNonce] = useState(0);
  const requestSequenceRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const personId = sp.get("personId");

  useEffect(() => {
    setLiveWorkspace(workspace);
  }, [workspace]);

  // ініціалізація форми один раз
  const [form, setForm] = useState<FormState>(() => ({
    eventId: sp.get("eventId"),
    eventTitle: sp.get("title") ?? "",
    eventDate: sp.get("date"),
    forWhom: "",
    gender: "",
    age: "",
    interests: "",
    occasion: sp.get("title") ?? "",
    budget: 150,
    anonymity: false,
    splitPayment: false,
    delivery: "kurier",
    notes: "",
  }));

  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const whatsAppHref = useMemo(() => {
    const text = [
      t("share.intro"),
      `• ${t("share.occasion", { value: form.occasion || form.eventTitle || "—" })}`,
      form.eventDate ? `• ${t("share.date", { value: formatDate(form.eventDate, locale) })}` : "",
      form.forWhom ? `• ${t("share.recipient", { value: form.forWhom })}` : "",
      form.budget ? `• ${t("share.budget", { value: form.budget })}` : "",
      form.splitPayment ? `• ${t("share.split")}` : "",
      form.anonymity ? `• ${t("share.anonymous")}` : "",
      form.interests ? `• ${t("share.interests", { value: form.interests })}` : "",
      form.notes ? `• ${t("share.notes", { value: form.notes })}` : "",
      "",
      `→ ${typeof window !== "undefined" ? window.location.href : "happydate.pl/gift/start"}`,
    ]
      .filter(Boolean)
      .join("\n");
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }, [form, locale, t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);

    try {
      const payload = {
        event_id: form.eventId,
        event_title: form.eventTitle || form.occasion,
        event_date: form.eventDate,
        for_whom: form.forWhom,
        gender: form.gender || null,
        age: form.age || null,
        interests: form.interests || null,
        occasion: form.occasion || null,
        budget_pln: form.budget,
        anonymity: form.anonymity,
        split_payment: form.splitPayment,
        delivery: form.delivery,
        notes: form.notes || null,
      };

      const result = await submitLegacyGiftRequest(payload);
      if (!result.ok) {
        console.warn("gift_requests insert error:", result.error);
        setMsg({ key: "saveError", success: false });
      } else {
        setMsg({ key: "success", success: true });
        setTimeout(() => router.push("/dashboard"), 900);
      }
    } catch {
      setMsg({ key: "error", success: false });
    } finally {
      setSaving(false);
    }
  }

  function discoveryQuestionType(questionId: string): GiftDiscoveryQuestionType | null {
    const maybeType = questionId.split(":").at(-1);
    if (
      maybeType === "budget" ||
      maybeType === "relationshipStrength" ||
      maybeType === "interests" ||
      maybeType === "hobbies" ||
      maybeType === "preferredStyle" ||
      maybeType === "favoriteBrands" ||
      maybeType === "dislikedGifts" ||
      maybeType === "urgency"
    ) {
      return maybeType;
    }
    return null;
  }

  function answersWithDiscoveryAnswer(
    questionId: string,
    value: GiftDiscoveryAnswerValue,
  ): GiftDiscoveryAnswers {
    const questionType = discoveryQuestionType(questionId);
    if (!questionType) return discoveryAnswers;
    return { ...discoveryAnswers, [questionType]: value };
  }

  function formWithDiscoveryAnswer(
    questionId: string,
    value: GiftDiscoveryAnswerValue,
  ): FormState {
    const questionType = discoveryQuestionType(questionId);
    if (!questionType) return form;
    const textValue = String(value).trim();
    const nextForm = { ...form };

    if (questionType === "budget" && typeof value === "number" && Number.isFinite(value)) {
      nextForm.budget = Math.max(0, Math.round(value));
    } else if (
      questionType === "interests" ||
      questionType === "hobbies" ||
      questionType === "favoriteBrands"
    ) {
      nextForm.interests = [nextForm.interests, textValue].filter(Boolean).join(", ");
    } else if (questionType === "dislikedGifts") {
      nextForm.notes = [nextForm.notes, textValue].filter(Boolean).join("\n");
    }

    return nextForm;
  }

  function visibleDiscoveryQuestions(
    questions: readonly GiftDiscoveryQuestion[] | undefined,
    answers = discoveryAnswers,
    skipped = skippedDiscoveryQuestions,
  ): GiftDiscoveryQuestion[] {
    const answeredTypes = new Set(Object.keys(answers));
    const skippedIds = new Set(skipped);
    const skippedTypes = new Set(skipped.map(discoveryQuestionType).filter(Boolean));
    return (questions ?? []).filter(
      (question) =>
        !answeredTypes.has(question.type) &&
        !skippedIds.has(question.id) &&
        !skippedTypes.has(question.type),
    );
  }

  function visibleMemoryCandidates(
    candidates: readonly HappyLearningDetectionCandidate[] | undefined,
  ): HappyLearningDetectionCandidate[] {
    const dismissed = new Set(dismissedMemoryCandidateIds);
    const saved = new Set(savedMemoryCandidateIds);
    return (candidates ?? []).filter(
      (candidate) => !dismissed.has(candidate.id) && !saved.has(candidate.id),
    );
  }

  function resetDiscoverySessionState() {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    requestSequenceRef.current += 1;
    setDiscoveryAnswers({});
    setSkippedDiscoveryQuestions([]);
    setDismissedMemoryCandidateIds([]);
    setMemoryCaptureStatus(null);
    setRefreshError(false);
    setRecommendationPending(false);
  }

  async function loadRecommendations({
    nextForm = form,
    nextAnswers = discoveryAnswers,
    nextSkipped = skippedDiscoveryQuestions,
    preservePrevious = false,
  }: {
    nextForm?: FormState;
    nextAnswers?: GiftDiscoveryAnswers;
    nextSkipped?: string[];
    preservePrevious?: boolean;
  } = {}) {
    if (!personId) return;
    const sequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = sequence;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setRecommendationPending(true);
    setRefreshError(false);
    const previousRecommendations = recommendations;
    if (!preservePrevious) {
      setRecommendations({ status: "loading" });
    }
    try {
      const result = await requestGiftRecommendations({
        personId,
        occasion: nextForm.occasion || nextForm.eventTitle || "general",
        locale,
        budget: {
          amount: nextForm.budget,
          currency: "PLN",
        },
        event: {
          id: nextForm.eventId,
          category: nextForm.occasion || nextForm.eventTitle || "general",
          date: nextForm.eventDate,
          personId,
        },
        discoveryAnswers: nextAnswers,
        skippedDiscoveryQuestions: nextSkipped,
        signal: controller.signal,
      });
      if (sequence !== requestSequenceRef.current) return;
      if (!result.ok) {
        if (preservePrevious && previousRecommendations.status === "success") {
          setRefreshError(true);
          setRecommendations(previousRecommendations);
        } else {
          setRecommendations({ status: "error", error: result.error });
        }
        return;
      }
      setRecommendations({ status: "success", ...result });
    } catch {
      if (sequence !== requestSequenceRef.current) return;
      if (preservePrevious && previousRecommendations.status === "success") {
        setRefreshError(true);
        setRecommendations(previousRecommendations);
      } else {
        setRecommendations({ status: "error", error: "request_failed" });
      }
    } finally {
      if (sequence === requestSequenceRef.current) {
        abortControllerRef.current = null;
        setRecommendationPending(false);
      }
    }
  }

  function handleDiscoveryAnswer(questionId: string, value: GiftDiscoveryAnswerValue) {
    const nextForm = formWithDiscoveryAnswer(questionId, value);
    const nextAnswers = answersWithDiscoveryAnswer(questionId, value);
    const nextSkipped = skippedDiscoveryQuestions.filter((question) => question !== questionId);
    setDiscoveryAnswers(nextAnswers);
    setSkippedDiscoveryQuestions(nextSkipped);
    setForm(nextForm);
    void loadRecommendations({
      nextForm,
      nextAnswers,
      nextSkipped,
      preservePrevious: recommendations.status === "success",
    });
  }

  function handleDiscoverySkip(questionId: string) {
    const nextSkipped = [...new Set([...skippedDiscoveryQuestions, questionId])];
    setSkippedDiscoveryQuestions(nextSkipped);
  }

  function handleGenerateClick() {
    resetDiscoverySessionState();
    void loadRecommendations({
      nextAnswers: {},
      nextSkipped: [],
      preservePrevious: false,
    });
  }

  async function handleMemoryCandidateConfirm(
    candidate: HappyLearningDetectionCandidate,
  ): Promise<"created" | "already_known" | "error"> {
    if (!personId || candidate.personId !== personId) return "error";

    setMemoryCaptureStatus(null);
    const result = await confirmHappyLearningCandidateWithSession(candidate);

    if (result.ok) {
      setSavedMemoryCandidateIds((current) => [...new Set([...current, candidate.id])]);
      setMemoryCaptureStatus({
        kind: result.status === "already_known" ? "alreadySaved" : "saved",
        candidateId: candidate.id,
      });
      return result.status;
    } else {
      setMemoryCaptureStatus({ kind: "saveFailed", candidateId: candidate.id });
      setMemoryCaptureRetryNonce((current) => current + 1);
      return "error";
    }
  }

  function handleMemoryCandidateDismiss(candidateId: string) {
    setDismissedMemoryCandidateIds((current) => [...new Set([...current, candidateId])]);
    setMemoryCaptureStatus(null);
  }

  const activeMemoryCandidate = recommendations.status === "success"
    ? visibleMemoryCandidates(recommendations.memoryCandidates)[0] ?? null
    : null;

  function applySuggestionToRequest(title: string, why: string) {
    setForm((current) => ({
      ...current,
      notes: [current.notes, `${title} — ${why}`].filter(Boolean).join("\n"),
    }));
    document.getElementById("gift-request-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function recommendationKey(title: string, category: string): string {
    return `${category}:${title.replace(/\s+/g, " ").trim().toLocaleLowerCase(locale)}`;
  }

  async function saveSuggestion(title: string, category: string) {
    if (!personId) return;
    const key = recommendationKey(title, category);
    if (savingSuggestionKey || savedSuggestionKeys.includes(key)) return;
    setSavingSuggestionKey(key);
    setSuggestionSaveErrorKey(null);
    try {
      await createPersonGiftIdea(personId, title, form.eventId);
      setSavedSuggestionKeys((current) => [...new Set([...current, key])]);
      try {
        setLiveWorkspace(await loadGiftWorkspace());
        setWorkspaceRefreshFailed(false);
      } catch {
        setWorkspaceRefreshFailed(true);
      }
    } catch {
      setSuggestionSaveErrorKey(key);
    } finally {
      setSavingSuggestionKey(null);
    }
  }

  return (
    <main className={`gift-care-page ${MobileUI.screen}`}>
      <div className={`gift-care-layout ${MobileUI.contentBottom} mx-auto w-full px-4 py-5 sm:px-5`}>
        {/* HERO */}
        <header className="gift-care-hero mb-5">
          <div className="gift-care-hero__glow" aria-hidden="true"><span>♥</span></div>
          <div className="gift-care-hero__content">
          <div className="gift-care-hero__badge inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-sm font-semibold text-sky-700 border border-white/70">
            {t("hero.badge")}
          </div>
          <h1 className="gift-care-hero__title mt-3">
            {t("hero.title")}
          </h1>
          <p className="gift-care-hero__subtitle mt-2">
            {t("hero.subtitle")}
          </p>
          </div>
        </header>

        {personId && (
          <section className="gift-care-recommendations mb-4 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="gift-care-section-title">
                  {t("recommendations.title")}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {t("recommendations.subtitle")}
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerateClick}
                disabled={recommendations.status === "loading" || recommendationPending}
                className="gift-care-generate min-h-11 rounded-2xl px-4 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={t("recommendations.generateAria")}
              >
                {recommendations.status === "loading" || recommendationPending
                  ? t("recommendations.loading")
                  : recommendations.status === "success"
                    ? t("recommendations.retry")
                    : t("recommendations.generate")}
              </button>
            </div>

            {recommendations.status === "loading" && (
              <div
                className="mt-4 grid gap-3"
                aria-live="polite"
                aria-label={t("recommendations.loading")}
              >
                <div className="h-40 animate-pulse rounded-2xl bg-white/70 ring-1 ring-slate-100" />
                <div className="h-28 animate-pulse rounded-2xl bg-white/60 ring-1 ring-slate-100" />
              </div>
            )}

            {recommendations.status === "error" && (
              <div className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-100" role="alert">
                <p className="font-bold">
                  {t(`recommendations.errors.${recommendations.error}`)}
                </p>
                <button
                  type="button"
                  onClick={() => loadRecommendations()}
                  className="mt-2 text-xs font-extrabold text-rose-800 underline underline-offset-2"
                >
                  {t("recommendations.retry")}
                </button>
              </div>
            )}

            {recommendations.status === "success" && (
              <div className="mt-4" aria-live="polite">
                {recommendations.suggestions.length > 0 ? (
                  <ol
                    className="grid gap-3"
                    aria-label={t("recommendations.listAria")}
                  >
                    {recommendations.suggestions.map((suggestion) => {
                      const suggestionKey = recommendationKey(suggestion.title, suggestion.category);
                      const alreadyPersisted = liveWorkspace?.activeIdeas.some((gift) =>
                        gift.personId === personId && gift.title.trim().toLocaleLowerCase(locale) === suggestion.title.trim().toLocaleLowerCase(locale)
                      ) ?? false;
                      const isSaved = alreadyPersisted || savedSuggestionKeys.includes(suggestionKey);
                      const isSaving = savingSuggestionKey === suggestionKey;
                      return (
                      <li key={suggestionKey}>
                        <GiftRecommendationCard
                          className="gift-care-recommendation-card"
                          suggestion={suggestion}
                          actions={
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <button
                                type="button"
                                onClick={() => void saveSuggestion(suggestion.title, suggestion.category)}
                                disabled={isSaved || savingSuggestionKey !== null}
                                className={`${MobileUI.button} border border-emerald-100 bg-emerald-50 px-4 text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-65`}
                                aria-label={isSaved ? t("recommendations.saved") : t("recommendations.saveForPerson")}
                              >
                                {isSaving ? t("recommendations.saving") : isSaved ? t("recommendations.saved") : t("recommendations.saveForPerson")}
                              </button>
                              <button
                                type="button"
                                onClick={() => applySuggestionToRequest(suggestion.title, suggestion.why)}
                                className={`${MobileUI.button} bg-sky-500 px-4 text-white shadow hover:bg-sky-600`}
                              >
                                {t("recommendations.useInRequest")}
                              </button>
                              <a
                                href="#gift-request-form"
                                className={`${MobileUI.button} inline-flex items-center justify-center border border-sky-100 bg-white px-4 text-sky-700 hover:bg-sky-50`}
                              >
                                {t("recommendations.backToForm")}
                              </a>
                              {suggestionSaveErrorKey === suggestionKey && (
                                <span role="alert" className="self-center text-xs font-bold text-rose-700">
                                  {t("recommendations.saveError")}
                                </span>
                              )}
                            </div>
                          }
                        />
                      </li>
                    );})}
                  </ol>
                ) : (
                  <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600 ring-1 ring-slate-100" role="status">
                    <p className="font-bold text-slate-800">
                      {t("recommendations.emptyTitle")}
                    </p>
                    <p className="mt-1">
                      {t("recommendations.emptyDescription")}
                    </p>
                    <button
                      type="button"
                      onClick={() => loadRecommendations()}
                      className="mt-2 text-xs font-extrabold text-sky-700 underline underline-offset-2"
                    >
                      {t("recommendations.retry")}
                    </button>
                  </div>
                )}

                {refreshError && (
                  <div className="mt-3 rounded-2xl bg-rose-50 p-3 text-sm font-bold text-rose-700 ring-1 ring-rose-100" role="alert">
                    {t("recommendations.refreshError")}
                  </div>
                )}

                {visibleDiscoveryQuestions(recommendations.discovery?.remainingQuestions).length ? (
                  <GiftDiscoveryPanel
                    className="mt-3"
                    followUpQuestions={visibleDiscoveryQuestions(recommendations.discovery?.remainingQuestions)}
                    completionScore={recommendations.discovery?.completionScore ?? 0}
                    onAnswer={handleDiscoveryAnswer}
                    onSkip={handleDiscoverySkip}
                    loading={recommendationPending}
                  />
                ) : recommendations.followUpQuestions.length > 0 && (
                  <section className="mt-3 rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-100" aria-labelledby="gift-follow-up-questions">
                    <h3 id="gift-follow-up-questions" className="text-sm font-black text-amber-900">
                      {t("recommendations.followUpTitle")}
                    </h3>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-medium text-amber-800">
                      {recommendations.followUpQuestions.map((question) => (
                        <li key={question}>{question}</li>
                      ))}
                    </ul>
                  </section>
                )}

                {memoryCaptureStatus && (
                  <div
                    className={[
                      "mt-3 rounded-2xl p-3 text-sm font-bold ring-1",
                      memoryCaptureStatus.kind === "saveFailed"
                        ? "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-400/10 dark:text-rose-100 dark:ring-rose-400/20"
                        : "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-400/10 dark:text-emerald-100 dark:ring-emerald-400/20",
                    ].join(" ")}
                    role={memoryCaptureStatus.kind === "saveFailed" ? "alert" : "status"}
                    aria-live="polite"
                  >
                    {memoryT(`status.${memoryCaptureStatus.kind}`)}
                  </div>
                )}

                {activeMemoryCandidate && (
                  <HappyLearningCard
                    key={`${activeMemoryCandidate.id}:${memoryCaptureRetryNonce}`}
                    candidate={activeMemoryCandidate}
                    onSave={handleMemoryCandidateConfirm}
                    onDismiss={handleMemoryCandidateDismiss}
                  />
                )}

                {recommendations.usedLegacyFallback && (
                  <p className="mt-3 text-xs font-semibold text-slate-500">
                    {t("recommendations.legacyFallback")}
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        <GiftWorkspacePanel workspace={liveWorkspace} hasError={workspaceError || workspaceRefreshFailed} />

        <ComingSoonNotice
          className="mb-4"
          badge={t("future.badge")}
          title={t("future.title")}
          description={t("future.description")}
          descriptionId="gift-future-description"
        />

        {/* Wydarzenie */}
        <fieldset disabled aria-describedby="gift-future-description" className="m-0 min-w-0 border-0 p-0 disabled:opacity-60">
        <section className="gift-care-form-card mb-4 p-4 sm:p-5" aria-disabled="true">
          <h2 className="gift-care-section-title mb-3">{t("form.event")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="sm:col-span-2">
              <label className="block text-slate-600 mb-1">{t("form.occasion")}</label>
              <input
                ref={titleRef}
                value={form.occasion}
                onChange={(e) => setForm((f) => ({ ...f, occasion: e.target.value }))}
                placeholder={t("form.occasionPlaceholder")}
                className={MobileUI.input}
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">{t("form.date")}</label>
              <input
                type="date"
                value={form.eventDate ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
                className={MobileUI.input}
              />
            </div>
          </div>
        </section>

        {/* Form */}
        <form
          id="gift-request-form"
          onSubmit={handleSubmit}
          className="gift-care-form-card space-y-4 p-4 sm:p-5"
          aria-disabled="true"
        >
          <h2 className="gift-care-section-title">{t("form.details")}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 mb-1">{t("form.recipient")}</label>
              <input
                value={form.forWhom}
                onChange={(e) => setForm((f) => ({ ...f, forWhom: e.target.value }))}
                placeholder={t("form.recipientPlaceholder")}
                className={MobileUI.input}
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1">{t("form.gender")}</label>
              <select
                value={form.gender}
                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                className={MobileUI.input}
              >
                <option value="">—</option>
                <option value="kobieta">{t("form.genderFemale")}</option>
                <option value="mezczyzna">{t("form.genderMale")}</option>
                <option value="inne">{t("form.genderOther")}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            <div className="sm:col-span-2">
              <label className="block text-slate-600 mb-1">
                {t("form.budget", { amount: form.budget })}
              </label>
              <input
                type="range"
                min={50}
                max={1000}
                step={10}
                value={form.budget}
                onChange={(e) => setForm((f) => ({ ...f, budget: Number(e.target.value) }))}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.splitPayment}
                  onChange={(e) => setForm((f) => ({ ...f, splitPayment: e.target.checked }))}
                />
                <span>{t("form.split")}</span>
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.anonymity}
                  onChange={(e) => setForm((f) => ({ ...f, anonymity: e.target.checked }))}
                />
                <span>{t("form.anonymous")}</span>
              </label>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className={`${MobileUI.button} bg-emerald-500 px-5 text-white shadow hover:bg-emerald-600`}
            >
              {t(saving ? "form.sending" : "form.submit")}
            </button>

            <a
              href={whatsAppHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`${MobileUI.button} border border-emerald-200 bg-white px-5 text-emerald-700 hover:bg-emerald-50`}
            >
              {t("form.share")}
            </a>
          </div>

          {msg && (
            <p
              className={`text-sm mt-2 ${
                msg.success ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {t(`status.${msg.key}`)}
            </p>
          )}
        </form>
        </fieldset>
      </div>
    </main>
  );
}
