"use client";

import { useEffect, useRef, useState } from "react";
import { Heart, Send, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Mood = "good" | "low" | "skip" | "custom";
type Line = { id: number; author: "happy" | "user"; text: string };

const COPY = {
  uk: {
    greeting: (name: string) => `Доброго дня, ${name}. Як ти сьогодні?`,
    privacy: "Увімкни персональну турботу, щоб HappyDate приватно пам’ятав твої check-in-и лише для підтримки тебе.",
    consent: "Увімкнути турботу",
    good: "Усе добре",
    low: "Трохи важко",
    skip: "Не хочу про це",
    placeholder: "Напиши своїми словами…",
    send: "Надіслати",
    plan: "Показати мій план",
    goodReply: "Радію це чути. Нехай цей стан залишиться з тобою. Я переглянув важливі справи та підготував короткий фокус на найближчий час.",
    lowReply: "Мені шкода, що день непростий. Не потрібно пояснювати більше, ніж хочеш. Я поруч — а поки підготував короткий фокус на найближчі важливі справи.",
    skipReply: "Розумію і поважаю твій вибір. Я переглянув твої справи та підготував короткий фокус на найближчий час.",
    customReply: "Дякую, що поділився. Я збережу це приватно для твоєї персональної підтримки. А зараз підготував важливі справи найближчим часом.",
    error: "Не вдалося зберегти відповідь. Спробуй ще раз.",
  },
  en: {
    greeting: (name: string) => `Good day, ${name}. How are you today?`, privacy: "Enable personal care so HappyDate can privately remember your check-ins only to support you.", consent: "Enable care", good: "I’m doing well", low: "It’s a bit hard", skip: "Not now", placeholder: "Write in your own words…", send: "Send", plan: "Show my plan", goodReply: "I’m glad to hear that. I reviewed your important dates and prepared a short focus for what is ahead.", lowReply: "I’m sorry today feels hard. You do not have to explain more than you want to. I’m here, and I prepared a short focus for your upcoming important dates.", skipReply: "I understand and respect your choice. I reviewed your dates and prepared a short focus for what is ahead.", customReply: "Thank you for sharing. I’ll keep this private for your personal support. I also prepared a short focus for what is ahead.", error: "We could not save your response. Please try again.",
  },
  pl: {
    greeting: (name: string) => `Dzień dobry, ${name}. Jak się dziś czujesz?`, privacy: "Włącz osobistą troskę, aby HappyDate prywatnie zapamiętywał Twoje check-iny tylko po to, by Cię wspierać.", consent: "Włącz troskę", good: "Wszystko dobrze", low: "Jest mi trochę ciężko", skip: "Nie chcę o tym", placeholder: "Napisz własnymi słowami…", send: "Wyślij", plan: "Pokaż mój plan", goodReply: "Cieszę się. Przejrzałem ważne sprawy i przygotowałem krótki plan tego, co przed Tobą.", lowReply: "Przykro mi, że dzień jest trudny. Nie musisz mówić więcej, niż chcesz. Jestem obok i przygotowałem krótki plan najbliższych ważnych spraw.", skipReply: "Rozumiem i szanuję Twój wybór. Przejrzałem Twoje sprawy i przygotowałem krótki plan.", customReply: "Dziękuję, że się tym podzieliłeś. Zachowam to prywatnie, aby lepiej Cię wspierać. Przygotowałem też krótki plan.", error: "Nie udało się zapisać odpowiedzi. Spróbuj ponownie.",
  },
} as const;

function getCopy(locale: string) {
  return COPY[locale as keyof typeof COPY] ?? COPY.uk;
}

interface WellbeingCheckInProps {
  locale: string;
  userName?: string | null;
}

export default function WellbeingCheckIn({ locale, userName }: WellbeingCheckInProps) {
  const copy = getCopy(locale);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [planReady, setPlanReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  const nextId = useRef(1);

  useEffect(() => {
    let active = true;
    const timerStore = timers.current;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return setEnabled(false);
      const { data } = await supabase.from("profiles").select("wellbeing_personalization_enabled").eq("id", user.id).maybeSingle();
      if (active) setEnabled(data?.wellbeing_personalization_enabled === true);
    })();
    return () => { active = false; timerStore.forEach(window.clearTimeout); };
  }, []);

  const addUserLine = (text: string) => setLines((current) => [...current, { id: nextId.current++, author: "user", text }]);

  const typeHappyLine = (text: string) => {
    const id = nextId.current++;
    setBusy(true);
    setLines((current) => [...current, { id, author: "happy", text: "" }]);
    const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setLines((current) => current.map((line) => line.id === id ? { ...line, text } : line));
      setBusy(false);
      setPlanReady(true);
      return;
    }
    [...text].forEach((_, index) => {
      const timeout = window.setTimeout(() => {
        setLines((current) => current.map((line) => line.id === id ? { ...line, text: text.slice(0, index + 1) } : line));
        if (index === text.length - 1) { setBusy(false); setPlanReady(true); }
      }, 13 * (index + 1));
      timers.current.push(timeout);
    });
  };

  const enableCare = async () => {
    setError(null); setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setEnabled(false); setBusy(false); return; }
    const { error: updateError } = await supabase.from("profiles").update({ wellbeing_personalization_enabled: true }).eq("id", user.id);
    setBusy(false);
    if (updateError) { setError(copy.error); return; }
    setEnabled(true);
  };

  const answer = async (mood: Mood, userText?: string) => {
    if (busy) return;
    setError(null); setPlanReady(false);
    const displayText = userText ?? (mood === "good" ? copy.good : mood === "low" ? copy.low : copy.skip);
    addUserLine(displayText);
    if (mood !== "skip") {
      setBusy(true);
      const { data: { user } } = await supabase.auth.getUser();
      const { error: insertError } = user
        ? await supabase.from("user_wellbeing_checkins").insert({ user_id: user.id, mood, note: mood === "custom" ? userText?.trim() || null : null })
        : { error: null };
      if (insertError) { setBusy(false); setError(copy.error); return; }
      setBusy(false);
    }
    typeHappyLine(mood === "good" ? copy.goodReply : mood === "low" ? copy.lowReply : mood === "custom" ? copy.customReply : copy.skipReply);
  };

  const submitNote = () => {
    const value = note.trim();
    if (!value) return;
    setNote("");
    void answer("custom", value);
  };

  return (
    <section className="mt-5 rounded-2xl border border-sky-100 bg-white/85 p-4 shadow-sm sm:p-5" aria-label="Персональна турбота HappyDate">
      <div className="flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><Heart size={19} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-black text-slate-950">{copy.greeting(userName?.trim() || "друже")}</p>
          {enabled === null ? <div className="mt-3 h-10 animate-pulse rounded-xl bg-slate-100" /> : !enabled ? <>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{copy.privacy}</p>
            <button type="button" onClick={() => void enableCare()} disabled={busy} className="mt-3 min-h-10 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60">{copy.consent}</button>
          </> : <>
            <div className="mt-3 space-y-2" aria-live="polite">
              {lines.map((line) => <div key={line.id} className={line.author === "happy" ? "max-w-2xl rounded-2xl rounded-tl-sm bg-sky-50 px-3 py-2 text-sm leading-6 text-slate-700" : "ml-auto max-w-2xl rounded-2xl rounded-tr-sm bg-slate-900 px-3 py-2 text-sm leading-6 text-white"}>{line.text || <span className="inline-flex gap-1" aria-label="HappyDate друкує"><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-500" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-500 [animation-delay:150ms]" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-500 [animation-delay:300ms]" /></span>}</div>)}
            </div>
            {!planReady && <>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={() => void answer("good")} className="min-h-10 rounded-xl bg-emerald-50 px-3 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50">{copy.good}</button>
                <button type="button" disabled={busy} onClick={() => void answer("low")} className="min-h-10 rounded-xl bg-amber-50 px-3 text-sm font-bold text-amber-900 transition hover:bg-amber-100 disabled:opacity-50">{copy.low}</button>
                <button type="button" disabled={busy} onClick={() => void answer("skip")} className="min-h-10 rounded-xl px-3 text-sm font-bold text-slate-500 transition hover:bg-slate-100 disabled:opacity-50">{copy.skip}</button>
              </div>
              <div className="mt-2 flex gap-2"><input value={note} onChange={(event) => setNote(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submitNote(); }} disabled={busy} maxLength={1000} placeholder={copy.placeholder} className="min-h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50" /><button type="button" onClick={submitNote} disabled={busy || !note.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white disabled:opacity-40" aria-label={copy.send}><Send size={16} /></button></div>
            </>}
            {planReady && <button type="button" onClick={() => document.getElementById("home-plan")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-bold text-white transition hover:bg-sky-700"><Sparkles size={16} aria-hidden="true" />{copy.plan}</button>}
          </>}
          {error && <p role="alert" className="mt-2 text-sm font-medium text-rose-700">{error}</p>}
        </div>
      </div>
    </section>
  );
}
