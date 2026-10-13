"use client";

import { useState } from "react";
import type { HomePrimaryHappyPresentation } from "@/lib/happy/home/buildHomePrimaryHappyPresentation";
import type { HomePrimaryHappyBlock as HomePrimaryHappyBlockModel } from "@/lib/happy/home/primaryHappyBlock.types";

type RescueSuggestion = { category: string; title: string; description: string; whyItFits?: string };

export default function HomePrimaryHappyBlock({ block, presentation, onContinueTask, onRespondIdea, onRespondAction, onSelectOccasionPerson, onRequestRescue }: {
  block: HomePrimaryHappyBlockModel;
  presentation: HomePrimaryHappyPresentation;
  onContinueTask: (taskId: string) => Promise<void>;
  onRespondIdea: (ideaId: string, response: "accept" | "dismiss") => Promise<void>;
  onRespondAction: (actionId: string, response: "approve" | "reject") => Promise<void>;
  onSelectOccasionPerson?: (occurrenceKey: string, personId: string) => Promise<void>;
  onRequestRescue?: (occurrenceKey: string) => Promise<readonly RescueSuggestion[]>;
}) {
  const [busy, setBusy] = useState<"accept" | "dismiss" | "approve" | "reject" | "select_person" | "rescue" | null>(null);
  const [failed, setFailed] = useState(false);
  const [rescueSuggestions, setRescueSuggestions] = useState<readonly RescueSuggestion[] | null>(null);
  const respond = async (response: "accept" | "dismiss") => {
    if (block.type !== "idea" || busy) return;
    setBusy(response);
    setFailed(false);
    try { await onRespondIdea(block.idea.id, response); } catch { setFailed(true); } finally { setBusy(null); }
  };
  const respondAction = async (response: "approve" | "reject") => {
    if (block.type !== "approval" || busy) return;
    setBusy(response);
    setFailed(false);
    try { await onRespondAction(block.action.id, response); } catch { setFailed(true); } finally { setBusy(null); }
  };
  const continueTask = async () => {
    if (block.type !== "task_progress" || busy) return;
    setBusy("approve"); setFailed(false);
    try { await onContinueTask(block.task.id); } catch { setFailed(true); } finally { setBusy(null); }
  };
  const selectOccasionPerson = async (personId: string) => {
    if (block.type !== "occasion" || !onSelectOccasionPerson || busy) return;
    setBusy("select_person"); setFailed(false);
    try { await onSelectOccasionPerson(block.signal.occurrenceKey, personId); } catch { setFailed(true); } finally { setBusy(null); }
  };
  const requestRescue = async () => {
    if (block.type !== "rescue" || !onRequestRescue || busy) return;
    setBusy("rescue"); setFailed(false);
    try { setRescueSuggestions(await onRequestRescue(block.signal.occurrenceKey)); } catch { setFailed(true); } finally { setBusy(null); }
  };
  const primary = presentation.primaryAction;
  return (
    <section className={`mt-5 w-full max-w-[760px] rounded-[1.35rem] border bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:p-5 ${presentation.urgency === "critical" || presentation.visualTreatment === "high_attention" ? "border-rose-200" : "border-violet-100"}`} aria-label={presentation.title}>
      <p className="text-sm font-semibold text-violet-700">✦ {presentation.eyebrow}</p>
      <div className="mt-3 border-t border-violet-100 pt-3">
        <p className="text-base font-semibold text-slate-900">{presentation.title}</p>
        {presentation.timing && <p className="mt-1 text-sm text-slate-500">{presentation.timing}</p>}
        {presentation.turningAgeLabel && <p className="mt-1 text-sm font-semibold text-violet-700">{presentation.turningAgeLabel}</p>}
        <p className={`mt-3 text-sm font-medium leading-6 ${presentation.urgency === "critical" ? "font-bold text-rose-800" : "text-slate-800"}`} role={presentation.urgency === "critical" ? "status" : undefined}>{presentation.urgency === "critical" && <span aria-hidden="true">⚠ </span>}{presentation.statusText}</p>
        {presentation.context && <p className="mt-2 text-sm leading-6 text-slate-600" data-provenance-source={`${presentation.context.source.type}:${presentation.context.source.id}`}>{presentation.context.text}</p>}
      </div>
      {primary?.kind === "continue_task" && block.type === "task_progress" && <button type="button" className="hd-button mt-4 min-h-10 bg-violet-600 px-4 text-sm text-white disabled:opacity-60" disabled={busy !== null} onClick={() => void continueTask()}>{busy === "approve" ? "…" : primary.label}</button>}
      {primary?.kind === "accept_idea" && block.type === "idea" && <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" className="hd-button min-h-10 bg-violet-600 px-4 text-sm text-white disabled:opacity-60" disabled={busy !== null} onClick={() => void respond("accept")}>{busy === "accept" ? "…" : primary.label}</button>{presentation.secondaryAction && <button type="button" className="min-h-10 px-2 text-sm text-slate-600 underline underline-offset-4 disabled:opacity-60" disabled={busy !== null} onClick={() => void respond("dismiss")}>{busy === "dismiss" ? "…" : presentation.secondaryAction.label}</button>}</div>}
      {primary?.kind === "approve_action" && block.type === "approval" && <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" className="hd-button min-h-10 bg-violet-600 px-4 text-sm text-white disabled:opacity-60" disabled={busy !== null} onClick={() => void respondAction("approve")}>{busy === "approve" ? "…" : primary.label}</button>{presentation.secondaryAction?.kind === "reject_action" && <button type="button" className="min-h-10 px-2 text-sm text-slate-600 underline underline-offset-4 disabled:opacity-60" disabled={busy !== null} onClick={() => void respondAction("reject")}>{busy === "reject" ? "…" : presentation.secondaryAction.label}</button>}</div>}
      {primary?.kind === "show_rescue" && block.type === "rescue" && <button type="button" className="hd-button mt-4 min-h-10 bg-violet-600 px-4 text-sm text-white disabled:opacity-60" disabled={busy !== null} onClick={() => void requestRescue()}>{busy === "rescue" ? "…" : primary.label}</button>}
      {block.type === "rescue" && rescueSuggestions && <ul className="mt-4 space-y-3" aria-label="Rescue options">{rescueSuggestions.map((suggestion, index) => <li key={`${suggestion.category}-${index}`} className="rounded-xl bg-violet-50 p-3 text-sm text-slate-800"><p className="font-semibold">{suggestion.title}</p><p className="mt-1 leading-6">{suggestion.description}</p>{suggestion.whyItFits && <p className="mt-1 text-slate-600">{suggestion.whyItFits}</p>}</li>)}</ul>}
      {block.type === "occasion" && presentation.occasionCandidates && presentation.occasionCandidates.length > 0 && <div className="mt-4 flex flex-wrap gap-3">{presentation.occasionCandidates.map((candidate) => <button key={candidate.personId} type="button" className="hd-button min-h-10 bg-violet-600 px-4 text-sm text-white disabled:opacity-60" disabled={busy !== null} onClick={() => void selectOccasionPerson(candidate.personId)}>{busy === "select_person" ? "…" : candidate.name}</button>)}</div>}
      {failed && presentation.errorText && <p className="mt-3 text-sm text-rose-700" role="alert">{presentation.errorText}</p>}
    </section>
  );
}
