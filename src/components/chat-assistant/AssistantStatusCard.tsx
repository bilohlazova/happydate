import { AlertTriangle, ArrowRight, Info, Sparkles } from "lucide-react";
import type { AssistantCardData } from "@/lib/brain/mapInsightToAssistant";

interface AssistantStatusCardProps {
  state: AssistantCardData["state"];
  title: string;
  description?: string | null;
  loading: boolean;
  loadingLabel: string;
  actionLabel?: string | null;
  onAction?: (() => void) | null;
}

export default function AssistantStatusCard({
  state,
  title,
  description,
  loading,
  loadingLabel,
  actionLabel,
  onAction,
}: AssistantStatusCardProps) {
  const StatusIcon = state === "urgent" ? AlertTriangle : state === "active" ? Info : Sparkles;

  return (
    <section className="rounded-[22px] border border-white/90 bg-white/72 p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)] backdrop-blur-xl" aria-busy={loading}>
      {loading ? (
        <div className="flex animate-pulse items-start gap-3" role="status">
          <span className="sr-only">{loadingLabel}</span>
          <span className="h-10 w-10 shrink-0 rounded-2xl bg-slate-200/80" />
          <span className="min-w-0 flex-1 pt-1">
            <span className="block h-4 w-4/5 rounded-full bg-slate-200/80" />
            <span className="mt-2 block h-3 w-full rounded-full bg-slate-100" />
            <span className="mt-1.5 block h-3 w-2/3 rounded-full bg-slate-100" />
          </span>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${state === "urgent" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-sky-100 bg-sky-50 text-sky-700"}`}>
            <StatusIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="[overflow-wrap:anywhere] text-sm font-extrabold leading-5 text-slate-900">{title}</p>
            {description && (
              <p className="mt-1 [overflow-wrap:anywhere] text-xs leading-5 text-slate-500">{description}</p>
            )}
            {actionLabel && onAction && (
              <button type="button" onClick={onAction} className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-xl px-2 text-xs font-extrabold text-sky-700 transition hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">
                {actionLabel}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
