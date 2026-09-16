import Link from "next/link";
import type { HomeUpcomingEvent } from "@/lib/home/home.types";
import UpcomingEventRow from "./UpcomingEventRow";

export default function UpcomingEventsSection({ events, title, allLabel, emptyLabel }: { events: HomeUpcomingEvent[]; title: string; allLabel: string; emptyLabel: string }) {
  return (
    <section className="mt-6 min-w-0" aria-labelledby="next-events-title">
      <div className="mb-2 flex items-center justify-between gap-3"><h2 id="next-events-title" className="text-lg font-bold text-slate-900">{title}</h2><Link href="/dashboard" className="shrink-0 rounded-md text-sm font-bold text-sky-700 transition hover:text-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2">{allLabel} →</Link></div>
      {events.length ? <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white">{events.slice(0, 3).map((event) => <UpcomingEventRow key={event.id} event={event} />)}</ul> : <p className="text-sm text-slate-500">{emptyLabel}</p>}
    </section>
  );
}
