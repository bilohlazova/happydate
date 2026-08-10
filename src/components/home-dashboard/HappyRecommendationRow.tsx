"use client";

import Link from "next/link";
import { ChevronRight, LoaderCircle } from "lucide-react";
import { useState } from "react";
import type { GiftOutcomeValue } from "@/lib/gifts/gift.types";
import type { HomeRecommendation } from "@/lib/home/home.types";

type GiftFollowUpAction = "snooze" | "dismiss";
type BusyAction = GiftFollowUpAction | GiftOutcomeValue;

export default function HappyRecommendationRow({
  recommendation,
  onGiftOutcome,
  onGiftFollowUp,
  labels,
}: {
  recommendation: HomeRecommendation;
  onGiftOutcome: (giftId: string, outcome: GiftOutcomeValue) => Promise<void>;
  onGiftFollowUp: (giftId: string, action: GiftFollowUpAction) => Promise<void>;
  labels: {
    answerLabel: string;
    liked: string;
    notLiked: string;
    unsure: string;
    snooze: string;
    dismiss: string;
    error: string;
  };
}) {
  const [busy, setBusy] = useState<BusyAction | null>(null);
  const [failed, setFailed] = useState(false);

  async function run(action: BusyAction, save: (giftId: string) => Promise<void>) {
    if (!recommendation.giftFollowUp || busy) return;
    setBusy(action);
    setFailed(false);
    try {
      await save(recommendation.giftFollowUp.giftId);
    } catch {
      setFailed(true);
      setBusy(null);
    }
  }

  function answer(outcome: GiftOutcomeValue) {
    return run(outcome, (giftId) => onGiftOutcome(giftId, outcome));
  }

  function changeFollowUp(action: GiftFollowUpAction) {
    return run(action, (giftId) => onGiftFollowUp(giftId, action));
  }

  return (
    <li>
      <Link href={recommendation.href} className="flex min-w-0 items-center gap-3 px-3 py-3 transition hover:bg-sky-50/70 sm:px-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-lg" aria-hidden="true">{recommendation.icon}</span><span className="min-w-0 flex-1"><span className="block text-sm font-extrabold text-slate-800">{recommendation.title}</span>{recommendation.description && <span className="mt-1 block text-xs font-medium leading-relaxed text-slate-500">{recommendation.description}</span>}</span><ChevronRight size={17} className="shrink-0 text-slate-400" aria-hidden="true" /></Link>
      {recommendation.giftFollowUp && (
        <div className="px-3 pb-3 sm:px-4">
          <fieldset disabled={busy !== null} className="flex flex-wrap items-center gap-2">
            <legend className="mb-2 w-full text-xs font-bold text-slate-600">{labels.answerLabel}</legend>
            <button type="button" onClick={() => void answer("liked")} className="min-h-10 rounded-xl bg-emerald-50 px-3 text-xs font-extrabold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50">{busy === "liked" ? <LoaderCircle className="mx-auto h-4 w-4 animate-spin" /> : labels.liked}</button>
            <button type="button" onClick={() => void answer("not_liked")} className="min-h-10 rounded-xl bg-rose-50 px-3 text-xs font-extrabold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50">{busy === "not_liked" ? <LoaderCircle className="mx-auto h-4 w-4 animate-spin" /> : labels.notLiked}</button>
            <button type="button" onClick={() => void answer("unsure")} className="min-h-10 rounded-xl bg-amber-50 px-3 text-xs font-extrabold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50">{busy === "unsure" ? <LoaderCircle className="mx-auto h-4 w-4 animate-spin" /> : labels.unsure}</button>
          </fieldset>
          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
            <button type="button" disabled={busy !== null} onClick={() => void changeFollowUp("snooze")} className="min-h-9 rounded-xl bg-sky-50 px-3 text-xs font-extrabold text-sky-700 disabled:opacity-50">{busy === "snooze" ? <LoaderCircle className="mx-auto h-4 w-4 animate-spin" /> : labels.snooze}</button>
            <button type="button" disabled={busy !== null} onClick={() => void changeFollowUp("dismiss")} className="min-h-9 rounded-xl bg-slate-100 px-3 text-xs font-extrabold text-slate-600 disabled:opacity-50">{busy === "dismiss" ? <LoaderCircle className="mx-auto h-4 w-4 animate-spin" /> : labels.dismiss}</button>
            {failed && <span role="alert" className="w-full text-xs font-bold text-rose-600">{labels.error}</span>}
          </div>
        </div>
      )}
    </li>
  );
}
