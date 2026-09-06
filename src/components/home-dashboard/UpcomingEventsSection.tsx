import Link from "next/link";
import type { HomeUpcomingEvent } from "@/lib/home/home.types";
import UpcomingEventRow from "./UpcomingEventRow";

export default function UpcomingEventsSection({ events, title, allLabel }: { events: HomeUpcomingEvent[]; title: string; allLabel: string }) {
  if (!events.length) return null;
  return (
    <section className="mt-8" aria-labelledby="next-events-title">
      <div className="mb-3 flex items-center justify-between gap-3"><h2 id="next-events-title" className="text-xl font-bold text-slate-900">{title}</h2><Link href="/dashboard" className="text-sm font-bold text-sky-700 transition hover:text-sky-800">{allLabel} →</Link></div>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-[1.25rem] border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.035)]">{events.map((event) => <UpcomingEventRow key={event.id} event={event} />)}</ul>
    </section>
  );
}
