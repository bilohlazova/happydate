import type { HomeInsight } from "@/lib/home/home.types";
import TodayInsightItem from "./TodayInsightItem";
import TodayStatsCard from "./TodayStatsCard";

export default function TodaySummary({ insights, count, statsLabel, statsDescription, emptyLabel }: { insights: HomeInsight[]; count: number; statsLabel: string; statsDescription: string; emptyLabel: string }) {
  return (
    <div className="mt-5 grid items-start gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
      {insights.length ? (
        <ul className="grid gap-2.5">{insights.map((insight) => <TodayInsightItem key={insight.id} insight={insight} />)}</ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-3.5 text-sm font-semibold text-slate-500">{emptyLabel}</div>
      )}
      <TodayStatsCard count={count} label={statsLabel} description={statsDescription} />
    </div>
  );
}
