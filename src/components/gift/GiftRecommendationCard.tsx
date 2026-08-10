"use client";

import {
  AlertTriangle,
  BadgeCheck,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, type ReactNode } from "react";
import type { GiftRecommendationSuggestion } from "@/lib/gift-intelligence";
import { MobileUI } from "@/lib/theme/mobile";
import {
  formatGiftRecommendationPrice,
  giftRecommendationCategoryKey,
  giftRecommendationCautionKey,
  giftRecommendationConfidenceKey,
  giftRecommendationSignalKey,
  GIFT_RECOMMENDATION_CATEGORY_ICONS,
  GIFT_RECOMMENDATION_CAUTION_ICONS,
  GIFT_RECOMMENDATION_SIGNAL_ICONS,
} from "./GiftRecommendationCard.presenter";

export interface GiftRecommendationCardProps {
  suggestion: GiftRecommendationSuggestion;
  className?: string;
  actions?: ReactNode;
}

const confidenceStyles = {
  high: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-400/20",
  medium: "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-400/10 dark:text-sky-200 dark:ring-sky-400/20",
  low: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-400/20",
} as const;

export function GiftRecommendationCard({
  suggestion,
  className = "",
  actions,
}: GiftRecommendationCardProps) {
  const t = useTranslations("gift.recommendationCard");
  const locale = useLocale();
  const signalsTitleId = useId();
  const cautionsTitleId = useId();
  const evidenceTitleId = useId();
  const price = formatGiftRecommendationPrice(
    suggestion.estimatedPrice,
    suggestion.currency,
    locale,
    t("priceUnknown"),
  );

  return (
    <article
      aria-label={t("aria.card", { title: suggestion.title })}
      className={[
        MobileUI.card,
        "group overflow-hidden border border-white/70 bg-white/85 p-4 shadow-[0_14px_34px_rgba(15,23,42,0.07)] backdrop-blur transition dark:border-white/10 dark:bg-slate-900/78 dark:shadow-[0_18px_42px_rgba(2,6,23,0.28)] sm:p-5",
        className,
      ].join(" ")}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-lg ring-1 ring-sky-100 dark:bg-sky-400/10 dark:ring-sky-400/20"
              aria-hidden="true"
            >
              {GIFT_RECOMMENDATION_CATEGORY_ICONS[suggestion.category]}
            </span>
            <h3 className="min-w-0 text-base font-black leading-snug text-slate-950 dark:text-white sm:text-lg">
              {suggestion.title}
            </h3>
          </div>
        </div>

        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-extrabold text-sky-700 ring-1 ring-sky-100 dark:bg-sky-400/10 dark:text-sky-200 dark:ring-sky-400/20">
          <Sparkles size={14} aria-hidden="true" />
          {t(giftRecommendationCategoryKey(suggestion.category))}
        </span>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50/80 p-3 ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">
          <Lightbulb size={14} aria-hidden="true" />
          <h4>{t("whyTitle")}</h4>
        </div>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700 dark:text-slate-100">
          {suggestion.why}
        </p>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white/75 p-3 ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10">
          <dt className="text-xs font-bold text-slate-500 dark:text-slate-300">
            {t("confidenceLabel")}
          </dt>
          <dd className="mt-1">
            <span
              className={[
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold ring-1",
                confidenceStyles[suggestion.confidence],
              ].join(" ")}
            >
              <BadgeCheck size={14} aria-hidden="true" />
              {t(giftRecommendationConfidenceKey(suggestion.confidence))}
            </span>
          </dd>
        </div>

        <div className="rounded-2xl bg-white/75 p-3 ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10">
          <dt className="text-xs font-bold text-slate-500 dark:text-slate-300">
            {t("priceLabel")}
          </dt>
          <dd className="mt-1 text-sm font-black text-slate-900 dark:text-white">
            {suggestion.estimatedPrice === null
              ? price
              : t("priceApprox", { price })}
          </dd>
        </div>
      </dl>

      {suggestion.personalizationSignals.length > 0 && (
        <section className="mt-4" aria-labelledby={signalsTitleId}>
          <h4
            id={signalsTitleId}
            className="text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300"
          >
            {t("signalsTitle")}
          </h4>
          <ul className="mt-2 flex flex-wrap gap-2">
            {suggestion.personalizationSignals.map((signal) => (
              <li
                key={signal}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-extrabold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-400/10 dark:text-blue-100 dark:ring-blue-400/20"
              >
                <span aria-hidden="true">{GIFT_RECOMMENDATION_SIGNAL_ICONS[signal]}</span>
                {t(giftRecommendationSignalKey(signal))}
              </li>
            ))}
          </ul>
        </section>
      )}

      {suggestion.learningEvidence && suggestion.learningEvidence.length > 0 && (
        <section
          className="mt-4 rounded-2xl bg-emerald-50/80 p-3 ring-1 ring-emerald-100 dark:bg-emerald-400/10 dark:ring-emerald-400/20"
          aria-labelledby={evidenceTitleId}
        >
          <h4 id={evidenceTitleId} className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-200">
            {t("learningEvidenceTitle")}
          </h4>
          <ul className="mt-2 space-y-2">
            {suggestion.learningEvidence.map((evidence) => (
              <li key={evidence.giftId} className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">
                {t(`learningOutcomes.${evidence.outcome}`, { gift: evidence.giftTitle })}
                <span className="ml-1 text-xs font-medium opacity-75">
                  · {t(`learningMatch.${evidence.matchedBy}`)}
                </span>
                {evidence.note ? <span className="block text-xs font-medium opacity-80">“{evidence.note}”</span> : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      {suggestion.cautions.length > 0 && (
        <section className="mt-4" aria-labelledby={cautionsTitleId}>
          <h4
            id={cautionsTitleId}
            className="sr-only"
          >
            {t("cautionsTitle")}
          </h4>
          <ul className="flex flex-wrap gap-2">
            {suggestion.cautions.map((caution) => (
              <li
                key={caution}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-100 dark:bg-amber-400/10 dark:text-amber-100 dark:ring-amber-400/20"
              >
                <AlertTriangle size={13} aria-hidden="true" />
                <span aria-hidden="true">
                  {GIFT_RECOMMENDATION_CAUTION_ICONS[caution]}
                </span>
                {t(giftRecommendationCautionKey(caution))}
              </li>
            ))}
          </ul>
        </section>
      )}

      {actions ? (
        <div className="mt-4 border-t border-slate-100 pt-3 dark:border-white/10">
          {actions}
        </div>
      ) : null}
    </article>
  );
}
