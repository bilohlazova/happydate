import { ChevronRight } from "lucide-react";
import type { AssistantAction } from "./types";

interface AssistantActionsProps {
  label: string;
  actions: AssistantAction[];
  onSelect: (action: AssistantAction) => void;
}

export default function AssistantActions({ label, actions, onSelect }: AssistantActionsProps) {
  return (
    <section aria-label={label} className="mt-4">
      <p className="mb-2 px-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <div className="space-y-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => onSelect(action)}
              className="group flex min-h-[72px] w-full min-w-0 items-center gap-3 rounded-[20px] border border-white/90 bg-white/75 p-3 text-left shadow-[0_10px_28px_rgba(15,23,42,0.055)] transition duration-200 hover:-translate-y-0.5 hover:border-sky-200 hover:bg-white hover:shadow-[0_14px_34px_rgba(15,23,42,0.08)] active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-50 text-sky-700 transition group-hover:border-sky-200 group-hover:bg-sky-50">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block [overflow-wrap:anywhere] text-sm font-extrabold leading-5 text-slate-900">
                  {action.title}
                </span>
                <span className="mt-0.5 block [overflow-wrap:anywhere] text-xs leading-4 text-slate-500">
                  {action.description}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-sky-600" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
