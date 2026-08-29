import Link from "next/link";
import { ChevronRight, Gift, Sparkles } from "lucide-react";
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
    <section className="mt-6 overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.07)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${event.isImportant ? "text-pink-600" : "text-sky-600"}`}>{event.label}</p>
          <h2 className="mt-2 text-xl font-black leading-tight tracking-[-0.02em] text-slate-950 sm:text-2xl">{event.title}</h2>
          <p className="mt-2 text-sm font-semibold capitalize text-slate-500">{event.dateLabel}{event.timeOfDay ? ` · ${event.timeOfDay}` : ""}{event.durationMinutes ? ` · ${event.durationMinutes} min` : ""} · {event.countdownLabel}</p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${event.daysUntil <= 7 ? "bg-pink-50 text-pink-700" : "bg-sky-50 text-sky-700"}`}>{event.countdownLabel}</span>
      </div>

      {event.birthdayAge !== null && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-extrabold text-violet-800">
          <span aria-hidden="true">🎈</span>{birthdayAgeLabel(event.birthdayAge, locale)}
        </div>
      )}

      {event.preferences.length > 0 && (
        <div className="mt-4 rounded-2xl bg-amber-50 px-3.5 py-3">
          <p className="text-[11px] font-black uppercase tracking-wide text-amber-700">{preferencesLabel}</p>
          <p className="mt-1 text-sm font-semibold text-slate-700">{event.preferences.join(" · ")}</p>
        </div>
      )}

      {event.personId && event.daysUntil <= 60 && (
        <div className="mt-4 rounded-2xl border border-amber-200/80 bg-[linear-gradient(120deg,#fffbeb_0%,#fff7ed_100%)] p-3.5 sm:p-4">
          <div className="flex gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700 shadow-sm" aria-hidden="true"><Gift size={19} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-slate-900">{reminderLabels.pickGift}</p>
              <p className="mt-1 text-sm font-medium leading-relaxed text-slate-600">
                {event.preferences.length ? <><Sparkles className="mr-1 inline h-4 w-4 text-amber-600" aria-hidden="true" />{event.preferences.join(" · ")}</> : giftContextLabel}
              </p>
              <button type="button" onClick={onPickGift} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-200 bg-[#fff8ec] px-3.5 text-sm font-extrabold text-[#925213] transition hover:bg-[#ffefd6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">
                <Gift size={16} aria-hidden="true" />{reminderLabels.pickGift}
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
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
