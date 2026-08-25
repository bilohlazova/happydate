"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, ChevronLeft, Gift, Heart, Info, Sparkles, UserRound } from "lucide-react";
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
import { createPersonGiftIdea, loadGiftRecipientContext, loadGiftWorkspace } from "@/lib/gifts/gift.loaders";
import type { GiftRecipientContextViewModel, GiftWorkspaceViewModel } from "@/lib/gifts/gift.types";
import {
  requestGiftRecommendations,
  type GiftRecommendationsResult,
} from "@/lib/gifts/giftRecommendationClient";
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
  notes: string;
};

type RecommendationState =
  | { status: "idle" }
  | { status: "loading" }
  | Extract<GiftRecommendationsResult, { ok: true }> & { status: "success" }
  | ({ status: "error" } & Omit<Exclude<GiftRecommendationsResult, { ok: true }>, "ok">);

export default function GiftStartPage({
  workspace,
  workspaceError,
}: {
  workspace: GiftWorkspaceViewModel | null;
  workspaceError: boolean;
}) {
  const sp = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("gift");
  const memoryT = useTranslations("memoryCapture");
  const [recommendations, setRecommendations] = useState<RecommendationState>({ status: "idle" });
  const [recommendationPending, setRecommendationPending] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const [savingSuggestionKey, setSavingSuggestionKey] = useState<string | null>(null);
  const [savedSuggestionKeys, setSavedSuggestionKeys] = useState<string[]>([]);
  const [suggestionSaveErrorKey, setSuggestionSaveErrorKey] = useState<string | null>(null);
  const [liveWorkspace, setLiveWorkspace] = useState<GiftWorkspaceViewModel | null>(workspace);
  const [recipientContext, setRecipientContext] = useState<GiftRecipientContextViewModel | null>(null);
  const [recipientContextError, setRecipientContextError] = useState(false);
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
  const requestedEventId = sp.get("eventId");
  const requestedDate = sp.get("date");
  const requestedTitle = sp.get("title");
  const requestedOccasion = sp.get("occasion");
  const requestedReturnTo = sp.get("returnTo");
  const returnTo = requestedReturnTo?.startsWith("/") && !requestedReturnTo.startsWith("//")
    ? requestedReturnTo
    : "/dashboard";

  const [form, setForm] = useState<FormState>(() => ({
    eventId: null,
    eventTitle: requestedTitle ?? "",
    eventDate: requestedDate,
    forWhom: "",
    gender: "",
    age: "",
    interests: "",
    occasion: requestedOccasion ?? requestedTitle ?? "",
    budget: 150,
    notes: "",
  }));

  useEffect(() => {
    // Keep the editable client workspace aligned after a server refresh.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLiveWorkspace(workspace);
  }, [workspace]);

  useEffect(() => {
    let active = true;
    if (!personId) return () => { active = false; };
    loadGiftRecipientContext(personId, requestedEventId)
      .then((context) => {
        if (!active) return;
        setRecipientContextError(false);
        setRecipientContext(context);
        if (context.event) {
          setForm((current) => ({
            ...current,
            eventId: context.event!.id,
            eventTitle: context.event!.title,
            eventDate: context.event!.date,
            occasion: context.event!.category ?? requestedOccasion ?? current.occasion,
          }));
        } else {
          setForm((current) => ({ ...current, eventId: null }));
        }
      })
      .catch(() => {
        if (active) {
          setRecipientContext(null);
          setRecipientContextError(true);
        }
      });
    return () => { active = false; };
  }, [personId, requestedEventId, requestedOccasion]);

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
          setRecommendations({ status: "error", error: result.error, retryAfter: result.retryAfter });
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

  const visibleWorkspace = useMemo<GiftWorkspaceViewModel | null>(() => {
    if (!liveWorkspace || !personId) return liveWorkspace;
    const activeIdeas = liveWorkspace.activeIdeas.filter((gift) => gift.personId === personId);
    const history = liveWorkspace.history.filter((gift) => gift.personId === personId);
    const all = [...activeIdeas, ...history];
    const counts = {
      idea: all.filter((gift) => gift.lifecycle === "idea").length,
      selected: all.filter((gift) => gift.lifecycle === "selected").length,
      purchased: all.filter((gift) => gift.lifecycle === "purchased").length,
      given: all.filter((gift) => gift.lifecycle === "given").length,
    };
    return {
      ...liveWorkspace,
      activeIdeas,
      history,
      counts,
      personIds: liveWorkspace.personIds.filter((id) => id === personId),
      eventIds: [...new Set(all.map((gift) => gift.eventId).filter((id): id is string => Boolean(id)))],
      recommendationContext: {
        activeIdeas,
        confirmedHistory: history,
        personIds: [personId],
        eventIds: [...new Set(all.map((gift) => gift.eventId).filter((id): id is string => Boolean(id)))],
      },
    };
  }, [liveWorkspace, personId]);

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
      await createPersonGiftIdea(personId, title, recipientContext?.event?.id ?? null);
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
        {personId && (
          <Link href={returnTo} className="mb-3 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-extrabold text-slate-600 transition-colors hover:bg-white hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            {t("recipient.backToCalendar")}
          </Link>
        )}

        {/* HERO */}
        <header className="gift-care-hero mb-5">
          <div className="gift-care-hero__glow" aria-hidden="true"><span>♥</span></div>
          <div className="gift-care-hero__content">
          <div className="gift-care-hero__badge inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-sm font-semibold text-sky-700 border border-white/70">
            <Gift className="h-4 w-4" aria-hidden="true" />
            {recipientContext?.person ? t("recipient.badge") : t("hero.badge")}
          </div>
          <h1 className="gift-care-hero__title mt-3">
            {recipientContext?.person
              ? t("recipient.title", { name: recipientContext.person.name })
              : t("hero.title")}
          </h1>
          <p className="gift-care-hero__subtitle mt-2">
            {recipientContext?.person
              ? t("recipient.subtitle", { name: recipientContext.person.name })
              : t("hero.subtitle")}
          </p>
          {recipientContext?.person && (
            <div className="mt-4 flex flex-wrap gap-2">
              {form.eventDate && (
                <span className="inline-flex items-center gap-2 rounded-full border border-white bg-white/80 px-3 py-2 text-xs font-extrabold text-slate-700">
                  <CalendarDays className="h-4 w-4 text-sky-500" aria-hidden="true" />
                  {new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${form.eventDate}T12:00:00`))}
                </span>
              )}
              {recipientContext.person.relationLabel && (
                <span className="inline-flex items-center gap-2 rounded-full border border-white bg-white/80 px-3 py-2 text-xs font-extrabold text-slate-700">
                  <UserRound className="h-4 w-4 text-violet-500" aria-hidden="true" />
                  {recipientContext.person.relationLabel}
                </span>
              )}
            </div>
          )}
          </div>
        </header>

        {personId && !recipientContext && !recipientContextError && (
          <div className="mb-4 h-28 animate-pulse rounded-[25px] bg-white/70" aria-label={t("recipient.loading")} />
        )}

        {(recipientContextError || recipientContext?.found === false) && (
          <div className="mb-4 flex gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
            <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div><strong>{t("recipient.errorTitle")}</strong><p className="mt-1">{t("recipient.errorDescription")}</p></div>
          </div>
        )}

        {recipientContext?.found && recipientContext.person && (
          <section className="gift-care-recommendations mb-4 p-4 sm:p-5" aria-labelledby="gift-known-context">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-pink-100 text-pink-600"><Heart className="h-5 w-5" aria-hidden="true" /></span>
              <div className="min-w-0 flex-1">
                <h2 id="gift-known-context" className="gift-care-section-title">{t("recipient.knownTitle", { name: recipientContext.person.name })}</h2>
                <p className="mt-1 text-sm text-slate-600">{t("recipient.knownDescription")}</p>
                {recipientContext.highlights.length ? (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {recipientContext.highlights.map((highlight) => (
                      <li key={`${highlight.kind}:${highlight.value}`} className="inline-flex items-center gap-1.5 rounded-full border border-sky-100 bg-white px-3 py-2 text-xs font-bold text-slate-700">
                        <Sparkles className="h-3.5 w-3.5 text-sky-500" aria-hidden="true" />{highlight.value}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">{t("recipient.noHighlights", { name: recipientContext.person.name })}</p>
                )}
              </div>
            </div>
          </section>
        )}

        {personId && recipientContext?.found && (
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
              <div className={`mt-4 rounded-2xl p-3 text-sm ring-1 ${recommendations.error === "daily_ai_budget_exceeded" ? "bg-amber-50 text-amber-900 ring-amber-100" : "bg-rose-50 text-rose-700 ring-rose-100"}`} role="alert">
                <p className="font-bold">
                  {t(`recommendations.errors.${recommendations.error}`)}
                </p>
                {recommendations.error === "daily_ai_budget_exceeded" && recommendations.retryAfter && (
                  <p className="mt-1 text-xs opacity-80">
                    {t("recommendations.retryAfter", {
                      hours: Math.max(1, Math.ceil(recommendations.retryAfter / 3_600)),
                    })}
                  </p>
                )}
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

        <GiftWorkspacePanel workspace={visibleWorkspace} hasError={workspaceError || workspaceRefreshFailed} />

        <ComingSoonNotice
          className="mb-4"
          badge={t("future.badge")}
          title={t("future.title")}
          description={t("future.description")}
          descriptionId="gift-future-description"
        />
      </div>
    </main>
  );
}
