import Link from "next/link";
import type { HomeUpcomingEvent } from "@/lib/home/home.types";
import UpcomingEventRow from "./UpcomingEventRow";

export default function UpcomingEventsSection({ events, title, allLabel }: { events: HomeUpcomingEvent[]; title: string; allLabel: string }) {
  if (!events.length) return null;
  return (
    <section className="mt-7">
      <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-lg font-black text-slate-900">{title}</h2><Link href="/dashboard" className="text-xs font-extrabold text-sky-600 hover:text-sky-700">{allLabel} ›</Link></div>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-[1.25rem] border border-slate-100 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.045)]">{events.map((event) => <UpcomingEventRow key={event.id} event={event} />)}</ul>
    </section>
  );
}
