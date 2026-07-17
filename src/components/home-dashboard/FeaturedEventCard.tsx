import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { HomeFeaturedEvent } from "@/lib/home/home.types";

export default function FeaturedEventCard({ event, preferencesLabel }: { event: HomeFeaturedEvent; preferencesLabel: string }) {
  return (
    <section className="mt-7 overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${event.isImportant ? "text-pink-600" : "text-sky-600"}`}>{event.label}</p>
          <h2 className="mt-2 text-xl font-black leading-tight tracking-[-0.02em] text-slate-950 sm:text-2xl">{event.title}</h2>
          <p className="mt-2 text-sm font-semibold capitalize text-slate-500">{event.dateLabel} · {event.countdownLabel}</p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${event.daysUntil <= 7 ? "bg-pink-50 text-pink-700" : "bg-sky-50 text-sky-700"}`}>{event.countdownLabel}</span>
      </div>

      {event.preferences.length > 0 && (
        <div className="mt-4 rounded-2xl bg-amber-50 px-3.5 py-3">
          <p className="text-[11px] font-black uppercase tracking-wide text-amber-700">{preferencesLabel}</p>
          <p className="mt-1 text-sm font-semibold text-slate-700">{event.preferences.join(" · ")}</p>
        </div>
      )}

      {event.metrics.length > 0 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {event.metrics.map((metric) => (
            <Link key={metric.id} href={metric.href} className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-50 px-3 text-sm font-bold text-slate-700 transition hover:bg-sky-50">
              <span aria-hidden="true">{metric.icon}</span><span className="min-w-0 flex-1">{metric.label}</span><ChevronRight size={15} className="text-slate-400" aria-hidden="true" />
            </Link>
          ))}
        </div>
      )}

      <Link href={event.href} className="hd-button mt-4 min-h-11 w-full border border-sky-200 bg-white text-sky-700 hover:bg-sky-50">
        {event.ctaLabel}<ChevronRight size={16} aria-hidden="true" />
      </Link>
    </section>
  );
}
