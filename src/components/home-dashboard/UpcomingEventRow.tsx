import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { HomeUpcomingEvent } from "@/lib/home/home.types";

export default function UpcomingEventRow({ event }: { event: HomeUpcomingEvent }) {
  return (
    <li>
      <Link href={event.href} className="flex min-w-0 items-center gap-3 px-3 py-3.5 transition active:bg-sky-50 hover:bg-sky-50/70 sm:px-4">
        <span className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl ${event.isImportant ? "bg-amber-50 text-amber-700 ring-1 ring-amber-100" : "bg-sky-50 text-sky-600"}`}>
          <strong className="text-base font-black leading-none">{event.dayLabel}</strong><span className="mt-1 text-[9px] font-black">{event.monthLabel}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-slate-800 sm:text-[15px]">{event.title}</span>
          <span className="mt-1 block truncate text-xs font-medium capitalize text-slate-500">{event.dateLabel}{event.timeOfDay ? ` · ${event.timeOfDay}` : ""}{event.durationMinutes ? ` · ${event.durationMinutes} min` : ""} · {event.countdownLabel}</span>
        </span>
        {event.categoryLabel && <span className="hidden max-w-28 truncate rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-extrabold text-slate-600 sm:block">{event.categoryLabel}</span>}
        <ChevronRight size={17} className="shrink-0 text-slate-400" aria-hidden="true" />
      </Link>
    </li>
  );
}
