import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { HomeUpcomingEvent } from "@/lib/home/home.types";

export default function UpcomingEventRow({ event }: { event: HomeUpcomingEvent }) {
  return (
    <li>
      <Link href={event.href} className="flex min-h-14 min-w-0 items-center gap-2.5 px-2.5 py-2.5 transition active:bg-sky-50 hover:bg-sky-50/70 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500 sm:gap-3 sm:px-3.5">
        <span className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg ${event.isImportant ? "bg-amber-50 text-amber-700 ring-1 ring-amber-100" : "bg-sky-50 text-sky-600"}`}>
          <strong className="text-sm font-black leading-none">{event.dayLabel}</strong><span className="mt-0.5 text-[8px] font-black">{event.monthLabel}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-slate-800 sm:text-[15px]">{event.title}</span>
          <span className="mt-0.5 block truncate text-[11px] font-medium capitalize text-slate-500">{event.categoryLabel ?? event.dateLabel}{event.countdownLabel ? ` · ${event.countdownLabel}` : ""}</span>
        </span>
        {event.categoryLabel && <span className="hidden max-w-28 truncate rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-extrabold text-slate-600 sm:block">{event.categoryLabel}</span>}
        <ChevronRight size={17} className="shrink-0 text-slate-400" aria-hidden="true" />
      </Link>
    </li>
  );
}
