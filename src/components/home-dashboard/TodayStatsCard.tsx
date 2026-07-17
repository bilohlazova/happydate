export default function TodayStatsCard({ count, label, description }: { count: number; label: string; description: string }) {
  return (
    <aside className="flex items-center gap-4 rounded-[1.25rem] border border-sky-100 bg-gradient-to-br from-white to-sky-50 p-4 shadow-[0_12px_34px_rgba(14,165,233,0.08)] md:flex-col md:items-start md:gap-2 md:p-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-xl shadow-sm md:hidden" aria-hidden="true">✦</span>
      <p className="flex-1 text-xs font-semibold leading-relaxed text-slate-600 md:flex-none">{description}</p>
      <div className="shrink-0">
        <strong className="block text-3xl font-black leading-none text-sky-600">{count}</strong>
        <span className="mt-1 block text-xs font-extrabold text-slate-700">{label}</span>
      </div>
    </aside>
  );
}
