import Link from "next/link";
import { ChevronRight, Gift } from "lucide-react";
import type { HomeFeaturedEvent } from "@/lib/home/home.types";
import type { ReminderRecord } from "@/lib/repositories/reminders";
import ReminderActions from "./ReminderActions";

interface FeaturedEventCardProps {
  event: HomeFeaturedEvent;
  locale: string;
  preferencesLabel: string;
  giftContextLabel: string;
  reminder: ReminderRecord | null;
  reminderBusy: boolean;
  reminderError: string | null;
  reminderLabels: React.ComponentProps<typeof ReminderActions>["labels"];
  onCompleteReminder: () => void;
  onSnoozeReminder: () => void;
  onUndoReminder: () => void;
  onPickGift: () => void;
}

function birthdayAgeLabel(age: number, locale: string): string {
  if (locale === "uk") {
    const lastTwo = age % 100;
    const last = age % 10;
    const word = lastTwo >= 11 && lastTwo <= 14 ? "років" : last === 1 ? "рік" : last >= 2 && last <= 4 ? "роки" : "років";
    return `Виповнюється ${age} ${word}`;
  }
  if (locale === "pl") return `Kończy ${age} ${age === 1 ? "rok" : age % 10 >= 2 && age % 10 <= 4 && !(age % 100 >= 12 && age % 100 <= 14) ? "lata" : "lat"}`;
  if (locale === "de") return `Wird ${age} ${age === 1 ? "Jahr" : "Jahre"} alt`;
  if (locale === "ru") return `Исполняется ${age} ${age % 10 === 1 && age % 100 !== 11 ? "год" : age % 10 >= 2 && age % 10 <= 4 && !(age % 100 >= 12 && age % 100 <= 14) ? "года" : "лет"}`;
  return `Turning ${age}`;
}

export default function FeaturedEventCard({
  event,
  locale,
  preferencesLabel,
  giftContextLabel,
  reminder,
  reminderBusy,
  reminderError,
  reminderLabels,
  onCompleteReminder,
  onSnoozeReminder,
  onUndoReminder,
  onPickGift,
}: FeaturedEventCardProps) {
  return (
    <section className="overflow-hidden rounded-[1.35rem] border border-amber-200/70 bg-[linear-gradient(120deg,#fffdf8_0%,#fffaf0_100%)] p-4 shadow-[0_12px_34px_rgba(146,82,19,0.07)] sm:p-5">
      <div className="grid gap-4 md:grid-cols-[72px_minmax(0,1fr)_auto] md:items-center">
        <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-white text-amber-700 shadow-sm ring-1 ring-amber-100">
          <span className="text-xl" aria-hidden="true">{event.source === "birthday" ? "🎂" : "📅"}</span>
          <span className="mt-1 text-[10px] font-extrabold uppercase tracking-wide">{event.countdownLabel}</span>
        </div>
        <div className="min-w-0">
          <p className={`text-[11px] font-extrabold uppercase tracking-[0.12em] ${event.isImportant ? "text-amber-700" : "text-sky-700"}`}>{event.label}</p>
          <h2 className="mt-1.5 text-xl font-bold leading-tight tracking-[-0.02em] text-slate-950 sm:text-[1.35rem]">{event.title}</h2>
          {event.relationLabel && <p className="mt-1 text-sm font-bold text-slate-500">{event.relationLabel}</p>}
          {event.birthdayAge !== null && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-3 py-1.5 text-sm font-bold text-amber-900">
              <span aria-hidden="true">🎈</span>{birthdayAgeLabel(event.birthdayAge, locale)}
            </div>
          )}
          <p className="mt-3 text-sm font-medium capitalize text-slate-600">{event.dateLabel}{event.timeOfDay ? ` · ${event.timeOfDay}` : ""}{event.durationMinutes ? ` · ${event.durationMinutes} min` : ""} · {event.countdownLabel}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row md:w-48 md:flex-col">
          {event.personId && event.daysUntil <= 60 && <button type="button" onClick={onPickGift} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-bold text-white transition hover:bg-amber-700 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"><Gift size={16} aria-hidden="true" />{reminderLabels.pickGift}</button>}
          <Link href={event.href} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">{event.ctaLabel}<ChevronRight size={16} aria-hidden="true" /></Link>
        </div>
      </div>

      {event.preferences.length > 0 && (
        <div className="mt-4 rounded-2xl bg-amber-50 px-3.5 py-3">
          <p className="text-[11px] font-black uppercase tracking-wide text-amber-700">{preferencesLabel}</p>
          <p className="mt-1 text-sm font-semibold text-slate-700">{event.preferences.join(" · ")}</p>
        </div>
      )}

      {event.personId && event.daysUntil <= 60 && !event.preferences.length && <p className="mt-4 text-sm leading-6 text-slate-600">{giftContextLabel}</p>}

      {event.metrics.length > 0 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {event.metrics.map((metric) => (
            <Link key={metric.id} href={metric.href} className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-50 px-3 text-sm font-bold text-slate-700 transition hover:bg-sky-50">
              <span aria-hidden="true">{metric.icon}</span><span className="min-w-0 flex-1">{metric.label}</span><ChevronRight size={15} className="text-slate-400" aria-hidden="true" />
            </Link>
          ))}
        </div>
      )}

      {reminder && (
        <ReminderActions
          reminder={reminder}
          eventIsToday={event.daysUntil === 0}
          canPickGift={Boolean(event.personId)}
          busy={reminderBusy}
          error={reminderError}
          labels={reminderLabels}
          onComplete={onCompleteReminder}
          onSnooze={onSnoozeReminder}
          onUndo={onUndoReminder}
          onPickGift={onPickGift}
        />
      )}
    </section>
  );
}
