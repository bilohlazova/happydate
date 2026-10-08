"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale } from "next-intl";
import { ArrowLeft, CalendarDays, CheckCircle2, CircleAlert, LoaderCircle, Sparkles } from "lucide-react";

import type { EventPreparationPageViewModel } from "@/lib/events/eventPreparation.loader";
import { eventPreparationLabels } from "@/lib/events/eventPreparationLabels";
import { supabase } from "@/lib/supabaseClient";

type Preparation = NonNullable<EventPreparationPageViewModel["preparation"]>;

function formatDate(date: string, locale: string): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? date : new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(parsed);
}

export function EventPreparationContent({
  loading,
  failed,
  viewModel,
  onChanged,
}: {
  loading: boolean;
  failed: boolean;
  viewModel: EventPreparationPageViewModel | null;
  onChanged: () => Promise<void> | void;
}) {
  const locale = useLocale();
  const t = eventPreparationLabels(locale);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(false);

  async function startPreparation() {
    if (!viewModel?.event || starting || !viewModel.preparation?.canStartPreparation) return;
    setStarting(true);
    setStartError(false);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Missing authenticated session");
      const response = await fetch("/api/happy/tasks/birthday-preparation", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        // The server derives the owner, person, template and exact steps from this event.
        body: JSON.stringify({ eventId: viewModel.event.id }),
      });
      if (!response.ok) throw new Error(`Preparation request failed: ${response.status}`);
      await onChanged();
    } catch {
      setStartError(true);
    } finally {
      setStarting(false);
    }
  }

  if (loading) return <EventMessage label={t.loading} />;
  if (failed) return <EventMessage label={t.loadError} />;
  if (!viewModel?.found || !viewModel.event) return <EventMessage label={t.notFound} />;

  const { event, preparation } = viewModel;
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-2xl">
        <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-600 hover:bg-white hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t.back}
        </Link>
        <section className="mt-4 rounded-[2rem] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start gap-3">
            <span className="rounded-2xl bg-violet-100 p-3 text-violet-700"><CalendarDays aria-hidden="true" /></span>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{event.title}</h1>
              <p className="mt-1 text-sm font-medium text-slate-500">{formatDate(event.date, locale)}</p>
            </div>
          </div>
        </section>
        {preparation && <BirthdayPreparation preparation={preparation} onStart={startPreparation} starting={starting} startError={startError} />}
      </div>
    </main>
  );
}

function BirthdayPreparation({ preparation, onStart, starting, startError }: { preparation: Preparation; onStart: () => Promise<void>; starting: boolean; startError: boolean }) {
  const t = eventPreparationLabels(useLocale());
  const rows = [
    ["gift", preparation.gift, preparation.gift === "ready"],
    ["greeting", preparation.greeting, preparation.greeting === "ready"],
    ["plan", preparation.plan, preparation.plan !== "none"],
  ] as const;
  const stateLabel = (label: typeof rows[number][0], state: string) => label === "gift" ? t.giftStatus[state as "missing" | "ready"] : label === "greeting" ? t.greetingStatus[state as "missing" | "ready"] : t.planStatus[state as keyof typeof t.planStatus];
  const heading = (label: typeof rows[number][0]) => label === "gift" ? t.gift : label === "greeting" ? t.greeting : t.plan;
  return <section className="mt-4 rounded-[2rem] bg-white p-5 shadow-sm sm:p-7" aria-label={t.title}>
    <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-violet-600" aria-hidden="true" /><h2 className="text-xl font-extrabold text-slate-900">{t.title}</h2></div>
    <dl className="mt-5 space-y-3">{rows.map(([label, state, ready]) => <div key={label} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3"><dt className="font-bold text-slate-700">{heading(label)}</dt><dd className={`inline-flex items-center gap-1.5 text-sm font-bold ${ready ? "text-emerald-700" : "text-slate-500"}`}>{ready ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <CircleAlert className="h-4 w-4" aria-hidden="true" />}{stateLabel(label, state)}</dd></div>)}</dl>
    {preparation.canStartPreparation && <div className="mt-5"><button type="button" disabled={starting} onClick={() => { void onStart(); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-extrabold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60">{starting && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}{starting ? t.starting : t.start}</button>{startError && <p className="mt-2 text-sm font-semibold text-rose-700" role="alert">{t.startError}</p>}</div>}
  </section>;
}

function EventMessage({ label }: { label: string }) {
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><p className="rounded-2xl bg-white px-5 py-4 text-sm font-bold text-slate-600 shadow-sm">{label}</p></main>;
}
