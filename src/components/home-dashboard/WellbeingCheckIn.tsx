"use client";

import { useEffect, useRef, useState } from "react";
import { Heart, Send, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { HomeFeaturedEvent } from "@/lib/home/home.types";
import { wellbeingMode, wellbeingReply } from "@/lib/assistant/wellbeingConversation";

type Mood = "good" | "neutral" | "low" | "skip" | "custom";
type Line = { id: number; author: "happy" | "user"; text: string };

function personalReply(message: string, fallback: string) {
  const value = message.toLocaleLowerCase();
  if (/(не вистачає|бракує).{0,24}(розмов|спілкуван|людей)/.test(value)) {
    return "Розумію. Коли бракує живого спілкування, навіть звичайний день може відчуватися порожнім. Хочеш просто трохи поговорити чи розкажеш, за ким найбільше сумуєш?";
  }
  if (/(не знаю.{0,18}(що|як).{0,18}(зі мною|відчува)|сама не знаю)/.test(value)) {
    return "Так теж буває. Не завжди треба одразу розуміти причину. Можемо просто побути тут без потреби все пояснювати.";
  }
  if (/хоч.{0,8}(поговор|розпов)|поговор|важк|поган|нема.{0,8}настро|втом|посвар|робот.{0,12}(дістал|важк)/.test(value)) {
    return "Розумію. Якщо хочеш, розкажи, що сталося — можемо спокійно це проговорити. Тобі не потрібно підбирати правильні слова.";
  }
  if (/(добре|супер|раді|щаслив|чудов)/.test(value)) {
    return "Мені дуже приємно це чути. Нехай у цьому дні буде ще трохи того, що додає тобі сил.";
  }
  return fallback;
}

const COPY = {
  uk: {
    greeting: "Як ти сьогодні?",
    privacy: "Увімкни персональну турботу, щоб HappyDate приватно пам’ятав твої check-in-и лише для підтримки тебе.",
    consent: "Увімкнути турботу",
    good: "😊 Усе добре", neutral: "😐 Так собі", low: "💛 Сьогодні важко", skip: "Пропустити",
    placeholder: "Розкажи своїми словами…",
    send: "Надіслати",
    plan: "Показати мій план",
    goodReply: "Радію це чути. Нехай цей стан залишиться з тобою. Я переглянув важливі справи та підготував короткий фокус на найближчий час.",
    neutralReply: "Розумію. Не кожен день має бути легким або особливим. Якщо хочеш, можеш трохи розповісти, що зараз найбільше займає твої думки.",
    lowReply: "Мені шкода, що день непростий. Не потрібно пояснювати більше, ніж хочеш. Я поруч — а поки підготував короткий фокус на найближчі важливі справи.",
    skipReply: "Розумію і поважаю твій вибір. Я переглянув твої справи та підготував короткий фокус на найближчий час.",
    customReply: "Дякую, що поділився. Я поруч. А зараз я переглянув найближчі важливі справи, щоб тобі не доводилося тримати все в голові.",
    error: "Не вдалося зберегти відповідь. Спробуй ще раз.",
  },
  en: {
    greeting: "How are you today?", privacy: "Enable personal care so HappyDate can privately remember your check-ins only to support you.", consent: "Enable care", good: "😊 I’m doing well", neutral: "😐 So-so", low: "💛 Today is hard", skip: "Skip", placeholder: "Tell me in your own words…", send: "Send", plan: "Show my plan", goodReply: "I’m glad to hear that. I reviewed your important dates and prepared a short focus for what is ahead.", neutralReply: "I understand. Not every day needs to feel easy or special. If you want, tell me what is taking up the most space in your thoughts right now.", lowReply: "I’m sorry today feels hard. You do not have to explain more than you want to. I’m here, and I prepared a short focus for your upcoming important dates.", skipReply: "I understand and respect your choice. I reviewed your dates and prepared a short focus for what is ahead.", customReply: "Thank you for sharing. I’ll keep this private for your personal support. I also prepared a short focus for what is ahead.", error: "We could not save your response. Please try again.",
  },
  pl: {
    greeting: "Jak się dziś czujesz?", privacy: "Włącz osobistą troskę, aby HappyDate prywatnie zapamiętywał Twoje check-iny tylko po to, by Cię wspierać.", consent: "Włącz troskę", good: "😊 Wszystko dobrze", neutral: "😐 Tak sobie", low: "💛 Dziś jest ciężko", skip: "Pomiń", placeholder: "Opowiedz własnymi słowami…", send: "Wyślij", plan: "Pokaż mój plan", goodReply: "Cieszę się. Przejrzałem ważne sprawy i przygotowałem krótki plan tego, co przed Tobą.", neutralReply: "Rozumiem. Nie każdy dzień musi być łatwy ani wyjątkowy. Jeśli chcesz, powiedz, co teraz najbardziej zajmuje Twoje myśli.", lowReply: "Przykro mi, że dzień jest trudny. Nie musisz mówić więcej, niż chcesz. Jestem obok i przygotowałem krótki plan najbliższych ważnych spraw.", skipReply: "Rozumiem i szanuję Twój wybór. Przejrzałem Twoje sprawy i przygotowałem krótki plan.", customReply: "Dziękuję, że się tym podzieliłeś. Zachowam to prywatnie, aby lepiej Cię wspierać. Przygotowałem też krótki plan.", error: "Nie udało się zapisać odpowiedzi. Spróbuj ponownie.",
  },
  de: {
    greeting: "Wie geht es dir heute?", privacy: "Aktiviere persönliche Begleitung, damit HappyDate deine Check-ins privat für deine Unterstützung speichern kann.", consent: "Begleitung aktivieren", good: "😊 Mir geht es gut", neutral: "😐 Geht so", low: "💛 Heute ist es schwer", skip: "Überspringen", placeholder: "Erzähl es mit deinen Worten…", send: "Senden", plan: "Meinen Plan zeigen", goodReply: "Das freut mich. Ich habe deine wichtigen Termine angesehen und einen kurzen Überblick vorbereitet.", neutralReply: "Verstehe. Nicht jeder Tag muss leicht oder besonders sein. Wenn du möchtest, erzähl mir, was dich gerade am meisten beschäftigt.", lowReply: "Es tut mir leid, dass der Tag schwer ist. Du musst nicht mehr erzählen, als du möchtest. Ich bin hier.", skipReply: "Ich verstehe und respektiere deine Entscheidung. Ich habe einen kurzen Überblick vorbereitet.", customReply: "Danke, dass du das teilst. Ich bin hier und habe außerdem einen kurzen Überblick vorbereitet.", error: "Deine Antwort konnte nicht gespeichert werden. Bitte versuche es erneut.",
  },
  ru: {
    greeting: "Как ты сегодня?", privacy: "Включи персональную заботу, чтобы HappyDate мог приватно запоминать твои ответы только для поддержки.", consent: "Включить заботу", good: "😊 Всё хорошо", neutral: "😐 Так себе", low: "💛 Сегодня тяжело", skip: "Пропустить", placeholder: "Расскажи своими словами…", send: "Отправить", plan: "Показать мой план", goodReply: "Рад это слышать. Я посмотрел важные дела и подготовил короткий план.", neutralReply: "Понимаю. Не каждый день должен быть лёгким или особенным. Если хочешь, расскажи, что сейчас больше всего занимает твои мысли.", lowReply: "Мне жаль, что сегодня тяжело. Не нужно объяснять больше, чем хочется. Я рядом.", skipReply: "Понимаю и уважаю твой выбор. Я подготовил короткий план ближайших важных дел.", customReply: "Спасибо, что поделилась. Я рядом и подготовил короткий план ближайших важных дел.", error: "Не удалось сохранить ответ. Попробуй ещё раз.",
  },
} as const;

function getCopy(locale: string) {
  return COPY[locale as keyof typeof COPY] ?? COPY.uk;
}

interface WellbeingCheckInProps {
  locale: string;
  userName?: string | null;
  featuredEvent?: HomeFeaturedEvent | null;
}

export default function WellbeingCheckIn({ locale, featuredEvent }: WellbeingCheckInProps) {
  const copy = getCopy(locale);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [planReady, setPlanReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentLowCheckins, setRecentLowCheckins] = useState(0);
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
      if (data?.wellbeing_personalization_enabled) {
        const { data: checkins } = await supabase.from("user_wellbeing_checkins").select("mood").eq("user_id", user.id).order("created_at", { ascending: false }).limit(6);
        if (active) setRecentLowCheckins((checkins ?? []).filter((item) => item.mood === "low").length);
      }
    })();
    return () => { active = false; timerStore.forEach(window.clearTimeout); };
  }, []);

  const addUserLine = (text: string) => setLines((current) => [...current, { id: nextId.current++, author: "user", text }]);

  const typeHappyLine = (text: string, revealPlan = true) => {
    const id = nextId.current++;
    setBusy(true);
    setLines((current) => [...current, { id, author: "happy", text: "" }]);
    const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setLines((current) => current.map((line) => line.id === id ? { ...line, text } : line));
      setBusy(false);
      setPlanReady(revealPlan);
      return;
    }
    [...text].forEach((_, index) => {
      const timeout = window.setTimeout(() => {
        setLines((current) => current.map((line) => line.id === id ? { ...line, text: text.slice(0, index + 1) } : line));
        if (index === text.length - 1) { setBusy(false); setPlanReady(revealPlan); }
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
    const displayText = userText ?? (mood === "good" ? copy.good : mood === "neutral" ? copy.neutral : mood === "low" ? copy.low : copy.skip);
    addUserLine(displayText);
    if (mood !== "skip") {
      setBusy(true);
      const { data: { user } } = await supabase.auth.getUser();
      const { error: insertError } = user
        ? await supabase.from("user_wellbeing_checkins").insert({ user_id: user.id, mood: mood === "neutral" ? "custom" : mood, note: mood === "custom" ? userText?.trim() || null : null })
        : { error: null };
      if (insertError) { setBusy(false); setError(copy.error); return; }
      setBusy(false);
    }
    const gratitude = wellbeingMode(userText ?? "") === "daily_guidance";
    const needsConversation = mood === "neutral" || mood === "low" || (mood === "custom" && !gratitude && /(важк|поган|нема.{0,8}настро|втом|поговор|не вистачає|бракує|не знаю|посвар|робот)/i.test(userText ?? ""));
    const contextualReply = mood === "custom" ? wellbeingReply(userText ?? "", recentLowCheckins >= 2) : null;
    const reply = gratitude
      ? "Будь ласка. Я поруч, якщо захочеш повернутися до розмови. А зараз я підготував для тебе короткий план найближчих важливих подій."
      : contextualReply ?? (mood === "good" ? copy.goodReply : mood === "neutral" ? copy.neutralReply : mood === "low" ? (recentLowCheckins >= 2 ? copy.lowReply : copy.lowReply) : mood === "custom" ? personalReply(userText ?? "", copy.customReply) : copy.skipReply);
    const plan = featuredEvent ? ` ${featuredEvent.title} — ${featuredEvent.countdownLabel}.` : "";
    typeHappyLine(`${reply}${needsConversation ? "" : plan}`, !needsConversation);
  };

  const submitNote = () => {
    const value = note.trim();
    if (!value) return;
    setNote("");
    void answer("custom", value);
  };

  return (
    <section className="mt-5 rounded-[1.25rem] bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.055)] sm:p-5" aria-label="Персональна турбота HappyDate">
      <div className="flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><Heart size={19} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-slate-950 sm:text-[17px]">{copy.greeting}</p>
          {enabled === null ? <div className="mt-3 h-10 animate-pulse rounded-xl bg-slate-100" /> : !enabled ? <>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{copy.privacy}</p>
            <button type="button" onClick={() => void enableCare()} disabled={busy} className="mt-3 min-h-10 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60">{copy.consent}</button>
          </> : <>
            <div className="mt-3 space-y-2" aria-live="polite">
              {lines.map((line) => <div key={line.id} className={line.author === "happy" ? "max-w-[88%] rounded-[1.1rem] rounded-tl-sm bg-slate-100/80 px-3.5 py-2.5 text-[15px] leading-6 text-slate-700 sm:max-w-[72%]" : "ml-auto max-w-[80%] rounded-[1.1rem] rounded-tr-sm bg-sky-100 px-3.5 py-2.5 text-[15px] leading-6 text-slate-800 sm:max-w-[58%]"}>{line.text || <span className="inline-flex gap-1" aria-label="HappyDate друкує"><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-500" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-500 [animation-delay:150ms]" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-500 [animation-delay:300ms]" /></span>}</div>)}
            </div>
            {!planReady && <>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={() => void answer("good")} className="min-h-10 rounded-xl bg-emerald-50 px-3 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50">{copy.good}</button>
                <button type="button" disabled={busy} onClick={() => void answer("neutral")} className="min-h-10 rounded-xl bg-slate-100 px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50">{copy.neutral}</button>
                <button type="button" disabled={busy} onClick={() => void answer("low")} className="min-h-10 rounded-xl bg-amber-50 px-3 text-sm font-bold text-amber-900 transition hover:bg-amber-100 disabled:opacity-50">{copy.low}</button>
              </div>
              <button type="button" disabled={busy} onClick={() => void answer("skip")} className="mt-1 min-h-9 text-sm font-semibold text-slate-500 underline-offset-4 transition hover:text-slate-700 hover:underline disabled:opacity-50">{copy.skip}</button>
              <div className="mt-2 flex gap-2"><input value={note} onChange={(event) => setNote(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submitNote(); }} disabled={busy} maxLength={1000} placeholder={copy.placeholder} className="min-h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50" /><button type="button" onClick={submitNote} disabled={busy || !note.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white disabled:opacity-40" aria-label={copy.send}><Send size={16} /></button></div>
            </>}
            {planReady && <button type="button" onClick={() => { const plan = document.getElementById("upcoming"); const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches; plan?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }); }} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-bold text-white transition hover:bg-sky-700"><Sparkles size={16} aria-hidden="true" />{copy.plan} ↓</button>}
          </>}
          {error && <p role="alert" className="mt-2 text-sm font-medium text-rose-700">{error}</p>}
        </div>
      </div>
    </section>
  );
}
