"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
import type {
  GiftDiscoveryQuestion,
  GiftDiscoveryQuestionType,
} from "@/lib/gift-discovery";
import { MobileUI } from "@/lib/theme/mobile";

export type GiftDiscoveryAnswerValue = string | number;

export interface GiftDiscoveryPanelProps {
  followUpQuestions: readonly GiftDiscoveryQuestion[];
  completionScore: number;
  onAnswer: (questionId: string, value: GiftDiscoveryAnswerValue) => void;
  onSkip: (questionId: string) => void;
  loading?: boolean;
  className?: string;
}

const SEGMENTED_OPTIONS: Partial<Record<GiftDiscoveryQuestionType, string[]>> = {
  relationshipStrength: ["close", "medium", "distant"],
  preferredStyle: ["practical", "emotional", "elegant"],
  urgency: ["today", "thisWeek", "flexible"],
};

const SINGLE_LINE_QUESTIONS = new Set<GiftDiscoveryQuestionType>([
  "budget",
  "interests",
  "hobbies",
  "favoriteBrands",
]);

function clampCompletion(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function isLongTextQuestion(type: GiftDiscoveryQuestionType): boolean {
  return type === "dislikedGifts";
}

function isSingleLineQuestion(type: GiftDiscoveryQuestionType): boolean {
  return SINGLE_LINE_QUESTIONS.has(type);
}

function inputType(type: GiftDiscoveryQuestionType): "text" | "number" {
  return type === "budget" ? "number" : "text";
}

export function GiftDiscoveryPanel({
  followUpQuestions,
  completionScore,
  onAnswer,
  onSkip,
  loading = false,
  className = "",
}: GiftDiscoveryPanelProps) {
  const t = useTranslations("gift.discovery");
  const progressId = useId();
  const fieldId = useId();
  type TranslationKey = Parameters<typeof t>[0];
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(() => new Set());
  const [value, setValue] = useState("");
  const completion = clampCompletion(completionScore);
  const currentQuestion = useMemo(
    () => followUpQuestions.find((question) => !answeredIds.has(question.id)) ?? null,
    [answeredIds, followUpQuestions],
  );

  function completeQuestion(questionId: string) {
    setAnsweredIds((current) => {
      const next = new Set(current);
      next.add(questionId);
      return next;
    });
    setValue("");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentQuestion || loading) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    const answerValue = currentQuestion.type === "budget"
      ? Number(trimmed)
      : trimmed;
    onAnswer(currentQuestion.id, answerValue);
    completeQuestion(currentQuestion.id);
  }

  function handleSegmentedAnswer(option: string) {
    if (!currentQuestion || loading) return;
    onAnswer(currentQuestion.id, option);
    completeQuestion(currentQuestion.id);
  }

  function handleSkip() {
    if (!currentQuestion || loading) return;
    onSkip(currentQuestion.id);
    completeQuestion(currentQuestion.id);
  }

  if (completion >= 100 || !currentQuestion) {
    return (
      <section
        className={[
          MobileUI.card,
          "gift-discovery-soul border border-emerald-100 bg-emerald-50/80 p-4 text-emerald-900 backdrop-blur dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100",
          className,
        ].join(" ")}
        role="status"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-lg ring-1 ring-emerald-100 dark:bg-white/10 dark:ring-emerald-400/20" aria-hidden="true">
            ✨
          </span>
          <div>
            <h3 className="text-sm font-black">
              {t("completeTitle")}
            </h3>
            <p className="mt-1 text-sm font-semibold leading-relaxed">
              {t("completeDescription")}
            </p>
          </div>
        </div>
      </section>
    );
  }

  const segmentedOptions = SEGMENTED_OPTIONS[currentQuestion.type] ?? [];

  return (
    <section
      className={[
        MobileUI.card,
        "gift-discovery-soul border border-white/70 bg-white/85 p-4 shadow-[0_14px_34px_rgba(15,23,42,0.07)] backdrop-blur dark:border-white/10 dark:bg-slate-900/78 sm:p-5",
        className,
      ].join(" ")}
      aria-labelledby="gift-discovery-title"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 ring-1 ring-sky-100 dark:bg-sky-400/10 dark:text-sky-100 dark:ring-sky-400/20" aria-hidden="true">
            <Sparkles size={18} />
          </span>
          <div>
            <h3 id="gift-discovery-title" className="text-base font-black text-slate-950 dark:text-white">
              {t("title")}
            </h3>
            <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-200">
              {t("subtitle")}
            </p>
          </div>
        </div>
        <span className="inline-flex w-fit rounded-full bg-sky-50 px-3 py-1 text-xs font-extrabold text-sky-700 ring-1 ring-sky-100 dark:bg-sky-400/10 dark:text-sky-100 dark:ring-sky-400/20">
          {t("completion", { value: completion })}
        </span>
      </div>

      <div className="mt-4" aria-labelledby={progressId}>
        <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-500 dark:text-slate-300">
          <span id={progressId}>{t("progressLabel")}</span>
          <span>{completion}%</span>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"
          role="progressbar"
          aria-labelledby={progressId}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={completion}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all"
            style={{ width: `${completion}%` }}
          />
        </div>
      </div>

      <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
        <label htmlFor={fieldId} className="block text-sm font-black text-slate-900 dark:text-white">
          {t(`questions.${currentQuestion.type}.label`)}
        </label>
        <p className="text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-200">
          {t(`questions.${currentQuestion.type}.helper`)}
        </p>

        {segmentedOptions.length > 0 ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label={t(`questions.${currentQuestion.type}.label`)}>
            {segmentedOptions.map((option) => (
              <button
                key={option}
                type="button"
                disabled={loading}
                onClick={() => handleSegmentedAnswer(option)}
                className="min-h-10 rounded-full border border-sky-100 bg-sky-50 px-3 py-2 text-sm font-extrabold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-100"
              >
                {t(`questions.${currentQuestion.type}.options.${option}` as TranslationKey)}
              </button>
            ))}
          </div>
        ) : isLongTextQuestion(currentQuestion.type) ? (
          <textarea
            id={fieldId}
            value={value}
            disabled={loading}
            onChange={(event) => setValue(event.target.value)}
            placeholder={t(`questions.${currentQuestion.type}.placeholder` as TranslationKey)}
            className={`${MobileUI.input} min-h-24 resize-y`}
          />
        ) : isSingleLineQuestion(currentQuestion.type) ? (
          <input
            id={fieldId}
            type={inputType(currentQuestion.type)}
            min={currentQuestion.type === "budget" ? 0 : undefined}
            inputMode={currentQuestion.type === "budget" ? "numeric" : undefined}
            value={value}
            disabled={loading}
            onChange={(event) => setValue(event.target.value)}
            placeholder={t(`questions.${currentQuestion.type}.placeholder` as TranslationKey)}
            className={MobileUI.input}
          />
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          {segmentedOptions.length === 0 && (
            <button
              type="submit"
              disabled={loading || !value.trim()}
              className={`${MobileUI.button} bg-sky-500 px-4 text-white shadow hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {t("actions.answer")}
            </button>
          )}
          <button
            type="button"
            disabled={loading}
            onClick={handleSkip}
            className={`${MobileUI.button} border border-slate-200 bg-white px-4 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-100`}
          >
            {t("actions.skip")}
          </button>
        </div>
      </form>

      {loading && (
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-extrabold text-sky-700 ring-1 ring-sky-100 dark:bg-sky-400/10 dark:text-sky-100 dark:ring-sky-400/20" role="status" aria-live="polite">
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          {t("loading")}
        </div>
      )}
    </section>
  );
}
