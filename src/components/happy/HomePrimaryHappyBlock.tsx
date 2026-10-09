"use client";

import { useState } from "react";
import type { HomePrimaryHappyPresentation } from "@/lib/happy/home/buildHomePrimaryHappyPresentation";
import type { HomePrimaryHappyBlock as HomePrimaryHappyBlockModel } from "@/lib/happy/home/primaryHappyBlock.types";

export default function HomePrimaryHappyBlock({ block, presentation, onContinueTask, onRespondIdea }: {
  block: HomePrimaryHappyBlockModel;
  presentation: HomePrimaryHappyPresentation;
  onContinueTask: (taskId: string) => void;
  onRespondIdea: (ideaId: string, response: "accept" | "dismiss") => Promise<void>;
}) {
  const [busy, setBusy] = useState<"accept" | "dismiss" | null>(null);
  const [failed, setFailed] = useState(false);
  const respond = async (response: "accept" | "dismiss") => {
    if (block.type !== "idea" || busy) return;
    setBusy(response);
    setFailed(false);
    try { await onRespondIdea(block.idea.id, response); } catch { setFailed(true); } finally { setBusy(null); }
  };
  const primary = presentation.primaryAction;
  return (
    <section className={`mt-5 w-full max-w-[760px] rounded-[1.35rem] border bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:p-5 ${presentation.urgency === "critical" ? "border-rose-200" : "border-violet-100"}`} aria-label={presentation.title}>
      <p className="text-sm font-semibold text-violet-700">✦ {presentation.eyebrow}</p>
      <div className="mt-3 border-t border-violet-100 pt-3">
        <p className="text-base font-semibold text-slate-900">{presentation.title}</p>
        {presentation.timing && <p className="mt-1 text-sm text-slate-500">{presentation.timing}</p>}
        {presentation.turningAgeLabel && <p className="mt-1 text-sm font-semibold text-violet-700">{presentation.turningAgeLabel}</p>}
        <p className={`mt-3 text-sm font-medium leading-6 ${presentation.urgency === "critical" ? "font-bold text-rose-800" : "text-slate-800"}`} role={presentation.urgency === "critical" ? "status" : undefined}>{presentation.urgency === "critical" && <span aria-hidden="true">⚠ </span>}{presentation.statusText}</p>
        {presentation.context && <p className="mt-2 text-sm leading-6 text-slate-600" data-provenance-source={`${presentation.context.source.type}:${presentation.context.source.id}`}>{presentation.context.text}</p>}
      </div>
      {primary?.kind === "continue_task" && block.type === "task_progress" && <button type="button" className="hd-button mt-4 min-h-10 bg-violet-600 px-4 text-sm text-white" onClick={() => onContinueTask(block.task.id)}>{primary.label}</button>}
      {primary?.kind === "accept_idea" && block.type === "idea" && <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" className="hd-button min-h-10 bg-violet-600 px-4 text-sm text-white disabled:opacity-60" disabled={busy !== null} onClick={() => void respond("accept")}>{busy === "accept" ? "…" : primary.label}</button>{presentation.secondaryAction && <button type="button" className="min-h-10 px-2 text-sm text-slate-600 underline underline-offset-4 disabled:opacity-60" disabled={busy !== null} onClick={() => void respond("dismiss")}>{busy === "dismiss" ? "…" : presentation.secondaryAction.label}</button>}</div>}
      {failed && presentation.errorText && <p className="mt-3 text-sm text-rose-700" role="alert">{presentation.errorText}</p>}
    </section>
  );
}
