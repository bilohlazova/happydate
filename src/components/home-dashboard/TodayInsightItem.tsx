import type { HomeInsight } from "@/lib/home/home.types";

export default function TodayInsightItem({ insight }: { insight: HomeInsight }) {
  return (
    <li className="flex min-w-0 items-start gap-3 rounded-2xl bg-white px-3.5 py-3 ring-1 ring-slate-100">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-lg" aria-hidden="true">{insight.icon}</span>
      <div className="min-w-0 pt-0.5">
        <p className="text-sm font-extrabold leading-snug text-slate-800">{insight.title}</p>
        {insight.description && <p className="mt-1 truncate text-xs font-medium text-slate-500">{insight.description}</p>}
      </div>
    </li>
  );
}
