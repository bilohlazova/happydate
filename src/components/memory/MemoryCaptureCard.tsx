"use client";

import { Check, Lightbulb, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import type {
  MemoryCaptureCandidate,
  MemoryCaptureCandidateType,
} from "@/lib/memory-capture";
import { MobileUI } from "@/lib/theme/mobile";

export interface MemoryCaptureCardProps {
  candidate: MemoryCaptureCandidate;
  onConfirm: (candidateId: string) => void;
  onDismiss: (candidateId: string) => void;
  loading?: boolean;
  className?: string;
}

const CANDIDATE_ICONS: Record<MemoryCaptureCandidateType, string> = {
  interest: "✨",
  hobby: "🎯",
  favorite_brand: "☕",
  disliked_gift: "🚫",
  preferred_style: "🎨",
};

export function memoryCaptureLabelKey(
  type: MemoryCaptureCandidateType,
): `labels.${MemoryCaptureCandidateType}` {
  return `labels.${type}`;
}

export function memoryCaptureAriaLabelKey(
  type: MemoryCaptureCandidateType,
): `aria.candidate.${MemoryCaptureCandidateType}` {
  return `aria.candidate.${type}`;
}

export function MemoryCaptureCard({
  candidate,
  onConfirm,
  onDismiss,
  loading = false,
  className = "",
}: MemoryCaptureCardProps) {
  const t = useTranslations("memoryCapture");
  const titleId = useId();
  const [hidden, setHidden] = useState(false);

  function confirm() {
    if (loading) return;
    setHidden(true);
    onConfirm(candidate.id);
  }

  function dismiss() {
    if (loading) return;
    setHidden(true);
    onDismiss(candidate.id);
  }

  if (hidden) return null;

  return (
    <article
      className={[
        MobileUI.card,
        "border border-white/70 bg-white/90 p-4 shadow-[0_14px_34px_rgba(15,23,42,0.07)] backdrop-blur dark:border-white/10 dark:bg-slate-900/80 sm:p-5",
        className,
      ].join(" ")}
      aria-labelledby={titleId}
      aria-label={t("aria.card")}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100 dark:bg-amber-400/10 dark:text-amber-100 dark:ring-amber-400/20"
          aria-hidden="true"
        >
          <Lightbulb size={19} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 id={titleId} className="text-base font-black leading-snug text-slate-950 dark:text-white">
                {t("title")}
              </h3>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-200">
                {t("description")}
              </p>
            </div>

            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-400/10 dark:text-emerald-100 dark:ring-emerald-400/20">
              <Check size={13} aria-hidden="true" />
              {t("highConfidence")}
            </span>
          </div>

          <div
            className="mt-4 rounded-2xl bg-slate-50/85 p-3 ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10"
            aria-label={t(memoryCaptureAriaLabelKey(candidate.type), {
              value: candidate.value,
            })}
          >
            <div className="flex items-center gap-2">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-lg ring-1 ring-slate-100 dark:bg-white/10 dark:ring-white/10"
                aria-hidden="true"
              >
                {CANDIDATE_ICONS[candidate.type]}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">
                  {t(memoryCaptureLabelKey(candidate.type))}
                </p>
                <p className="mt-0.5 break-words text-sm font-black text-slate-950 dark:text-white">
                  {candidate.value}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={confirm}
              disabled={loading}
              aria-label={t("aria.save", { value: candidate.value })}
              className={`${MobileUI.button} bg-sky-500 px-4 text-white shadow hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {loading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  {t("saving")}
                </span>
              ) : (
                t("save")
              )}
            </button>
            <button
              type="button"
              onClick={dismiss}
              disabled={loading}
              aria-label={t("aria.notNow", { value: candidate.value })}
              className={`${MobileUI.button} border border-slate-200 bg-white px-4 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-100`}
            >
              <span className="inline-flex items-center justify-center gap-2">
                <X size={15} aria-hidden="true" />
                {t("notNow")}
              </span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
