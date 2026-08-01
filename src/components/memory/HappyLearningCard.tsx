"use client";

import { useState } from "react";
import { Brain, Check, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import type { HappyLearningDetectionCandidate } from "@/lib/happy-learning/happyLearningDetectV2.types";

export function HappyLearningCard({
  candidate,
  onDismiss,
  onSave,
}: {
  candidate: HappyLearningDetectionCandidate;
  onDismiss: (candidateId: string) => void;
  onSave: (candidate: HappyLearningDetectionCandidate) => Promise<"created" | "already_known" | "error">;
}) {
  const t = useTranslations("memoryCapture.learning");
  const conflict = candidate.semanticStatus === "conflict";
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "already_known" | "error">("idle");
  const labelKey = candidate.semanticTags.includes("favorite_color")
    ? "favorite_color"
    : candidate.semanticTags.includes("profession")
      ? "profession"
      : candidate.semanticTags.includes("clothing_size")
        ? "clothing_size"
        : candidate.semanticTags.includes("pet")
          ? "pet"
          : candidate.captureType;

  return (
    <section
      className="rounded-2xl border border-sky-100 bg-gradient-to-br from-white to-sky-50/80 p-3 shadow-sm sm:p-4"
      aria-label={t("ariaCard", { personName: candidate.personName })}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700" aria-hidden="true">
          {conflict ? <Brain className="size-4" /> : <Sparkles className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-extrabold leading-5 text-slate-900">
            {t(conflict ? "conflictTitle" : "title", { personName: candidate.personName })}
          </h3>
          <p className="mt-2 text-sm leading-5 text-slate-700">
            <span className="font-bold">{t(`labels.${labelKey}`)}:</span>{" "}
            <span className="[overflow-wrap:anywhere]">{candidate.value}</span>
          </p>
          {(conflict || status !== "idle") && (
            <p className="mt-2 text-xs font-semibold leading-4 text-slate-500" role="status">
              {conflict ? t("conflictUnavailable") : status === "saving" ? t("saving") : status === "saved" ? t("saved") : status === "already_known" ? t("already_known") : t("error")}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={conflict || status === "saving" || status === "saved" || status === "already_known"}
              onClick={async () => {
                if (conflict) return;
                setStatus("saving");
                const result = await onSave(candidate);
                setStatus(result === "created" ? "saved" : result);
              }}
              className="min-h-10 rounded-xl bg-sky-600 px-3 text-xs font-extrabold text-white disabled:opacity-55"
            >
              {(status === "saved" || status === "already_known") && <Check className="mr-1 inline size-3.5" aria-hidden="true" />}
              {t(conflict ? "update" : status === "saving" ? "saving" : "save")}
            </button>
            <button type="button" onClick={() => onDismiss(candidate.id)} className="min-h-10 rounded-xl px-3 text-xs font-extrabold text-slate-600 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">
              {t("notNow")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
