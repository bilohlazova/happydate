"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import Link from "next/link";
import ProgressiveConversation from "./ProgressiveConversation";
import { transitionGiftFlow } from "./giftFlow";
import { supabase } from "@/lib/supabaseClient";
import type { HomeFeaturedEvent } from "@/lib/home/home.types";
import { wellbeingReply } from "@/lib/assistant/wellbeingConversation";
import { isSameLocalCalendarDay } from "@/lib/wellbeing/sameDay";

type Mood = "good" | "neutral" | "low" | "skip" | "custom";
type Line = { id: number; author: "happy" | "user"; text: string };
type ConversationStep = "wellbeing" | "birthday_intro" | "gift_status";

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
    welcome: "Привіт",
    greeting: "Як ти сьогодні?",
    privacy: "Увімкни персональну турботу, щоб HappyDate приватно пам’ятав твої check-in-и лише для підтримки тебе.",
    consent: "Увімкнути турботу",
    good: "😊 Усе добре", neutral: "😐 Так собі", low: "💛 Сьогодні важко", skip: "Пропустити",
    placeholder: "Розкажи своїми словами…",
    send: "Надіслати",
    plan: "Показати мій план",
    goodReply: "Радий це чути 💙 Нехай цей стан залишиться з тобою. Я вже переглянув, що в тебе попереду.",
    neutralReply: "Розумію. Не кожен день має бути легким або особливим. Якщо хочеш, можеш трохи розповісти, що зараз найбільше займає твої думки.",
    lowReply: "Мені шкода, що день непростий. Не потрібно пояснювати більше, ніж хочеш. Я поруч.",
    skipReply: "Розумію і поважаю твій вибір. Я вже переглянув, що в тебе попереду.",
    customReply: "Дякую, що поділився. Я поруч. До речі, я вже переглянув, що в тебе попереду.",
    error: "Не вдалося зберегти відповідь. Спробуй ще раз.",
  },
  en: {
    welcome: "Hello",
    greeting: "How are you today?", privacy: "Enable personal care so HappyDate can privately remember your check-ins only to support you.", consent: "Enable care", good: "😊 I’m doing well", neutral: "😐 So-so", low: "💛 Today is hard", skip: "Skip", placeholder: "Tell me in your own words…", send: "Send", plan: "Show my plan", goodReply: "I’m glad to hear that. I reviewed your important dates and prepared a short focus for what is ahead.", neutralReply: "I understand. Not every day needs to feel easy or special. If you want, tell me what is taking up the most space in your thoughts right now.", lowReply: "I’m sorry today feels hard. You do not have to explain more than you want to. I’m here, and I prepared a short focus for your upcoming important dates.", skipReply: "I understand and respect your choice. I reviewed your dates and prepared a short focus for what is ahead.", customReply: "Thank you for sharing. I’ll keep this private for your personal support. I also prepared a short focus for what is ahead.", error: "We could not save your response. Please try again.",
  },
  pl: {
    welcome: "Cześć",
    greeting: "Jak się dziś czujesz?", privacy: "Włącz osobistą troskę, aby HappyDate prywatnie zapamiętywał Twoje check-iny tylko po to, by Cię wspierać.", consent: "Włącz troskę", good: "😊 Wszystko dobrze", neutral: "😐 Tak sobie", low: "💛 Dziś jest ciężko", skip: "Pomiń", placeholder: "Opowiedz własnymi słowami…", send: "Wyślij", plan: "Pokaż mój plan", goodReply: "Cieszę się. Przejrzałem ważne sprawy i przygotowałem krótki plan tego, co przed Tobą.", neutralReply: "Rozumiem. Nie każdy dzień musi być łatwy ani wyjątkowy. Jeśli chcesz, powiedz, co teraz najbardziej zajmuje Twoje myśli.", lowReply: "Przykro mi, że dzień jest trudny. Nie musisz mówić więcej, niż chcesz. Jestem obok i przygotowałem krótki plan najbliższych ważnych spraw.", skipReply: "Rozumiem i szanuję Twój wybór. Przejrzałem Twoje sprawy i przygotowałem krótki plan.", customReply: "Dziękuję, że się tym podzieliłeś. Zachowam to prywatnie, aby lepiej Cię wspierać. Przygotowałem też krótki plan.", error: "Nie udało się zapisać odpowiedzi. Spróbuj ponownie.",
  },
  de: {
    welcome: "Hallo",
    greeting: "Wie geht es dir heute?", privacy: "Aktiviere persönliche Begleitung, damit HappyDate deine Check-ins privat für deine Unterstützung speichern kann.", consent: "Begleitung aktivieren", good: "😊 Mir geht es gut", neutral: "😐 Geht so", low: "💛 Heute ist es schwer", skip: "Überspringen", placeholder: "Erzähl es mit deinen Worten…", send: "Senden", plan: "Meinen Plan zeigen", goodReply: "Das freut mich. Ich habe deine wichtigen Termine angesehen und einen kurzen Überblick vorbereitet.", neutralReply: "Verstehe. Nicht jeder Tag muss leicht oder besonders sein. Wenn du möchtest, erzähl mir, was dich gerade am meisten beschäftigt.", lowReply: "Es tut mir leid, dass der Tag schwer ist. Du musst nicht mehr erzählen, als du möchtest. Ich bin hier.", skipReply: "Ich verstehe und respektiere deine Entscheidung. Ich habe einen kurzen Überblick vorbereitet.", customReply: "Danke, dass du das teilst. Ich bin hier und habe außerdem einen kurzen Überblick vorbereitet.", error: "Deine Antwort konnte nicht gespeichert werden. Bitte versuche es erneut.",
  },
  ru: {
    welcome: "Привет",
    greeting: "Как ты сегодня?", privacy: "Включи персональную заботу, чтобы HappyDate мог приватно запоминать твои ответы только для поддержки.", consent: "Включить заботу", good: "😊 Всё хорошо", neutral: "😐 Так себе", low: "💛 Сегодня тяжело", skip: "Пропустить", placeholder: "Расскажи своими словами…", send: "Отправить", plan: "Показать мой план", goodReply: "Рад это слышать. Я посмотрел важные дела и подготовил короткий план.", neutralReply: "Понимаю. Не каждый день должен быть лёгким или особенным. Если хочешь, расскажи, что сейчас больше всего занимает твои мысли.", lowReply: "Мне жаль, что сегодня тяжело. Не нужно объяснять больше, чем хочется. Я рядом.", skipReply: "Понимаю и уважаю твой выбор. Я подготовил короткий план ближайших важных дел.", customReply: "Спасибо, что поделилась. Я рядом и подготовил короткий план ближайших важных дел.", error: "Не удалось сохранить ответ. Попробуй ещё раз.",
  },
} as const;

function getCopy(locale: string) {
  return COPY[locale as keyof typeof COPY] ?? COPY.uk;
}

const ACTION_COPY: Record<string, { view: string; later: string; all: string }> = {
  uk: { view: "Переглянути подію", later: "Пізніше", all: "Усі події →" },
  pl: { view: "Zobacz wydarzenie", later: "Później", all: "Wszystkie wydarzenia →" },
  en: { view: "View event", later: "Later", all: "All events →" },
  de: { view: "Termin ansehen", later: "Später", all: "Alle Termine →" },
  ru: { view: "Открыть событие", later: "Позже", all: "Все события →" },
};

interface WellbeingCheckInProps {
  locale: string;
  userName?: string | null;
  featuredEvent?: HomeFeaturedEvent | null;
  onPickGift?: () => void;
  onSaveGift?: (title: string) => Promise<void>;
}

export default function WellbeingCheckIn({ locale, userName, featuredEvent, onPickGift, onSaveGift }: WellbeingCheckInProps) {
  const copy = getCopy(locale);
  const wellbeingT = useTranslations("home.wellbeing");
  const actions = ACTION_COPY[locale] ?? ACTION_COPY.uk;
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [conversationStep, setConversationStep] = useState<ConversationStep>("wellbeing");
  const [giftStatusAction, setGiftStatusAction] = useReducer(transitionGiftFlow, "status");
  const [giftTitle, setGiftTitle] = useState("");
  const [savingGift, setSavingGift] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentLowCheckins, setRecentLowCheckins] = useState(0);
  const [wellbeingHistoryLoading, setWellbeingHistoryLoading] = useState(true);
  const [wellbeingHistoryResolved, setWellbeingHistoryResolved] = useState(false);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [hasSubmittedWellbeingResponse, setHasSubmittedWellbeingResponse] = useState(false);
  const initializedConversationStateRef = useRef<string | null>(null);
  const timers = useRef<number[]>([]);
  const nextId = useRef(1);
  const handoffOpenedRef = useRef(false);

  useEffect(() => {
    let active = true;
    const timerStore = timers.current;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) { setEnabled(false); setWellbeingHistoryLoading(false); setWellbeingHistoryResolved(true); return; }
      const { data } = await supabase.from("profiles").select("wellbeing_personalization_enabled").eq("id", user.id).maybeSingle();
      if (active) setEnabled(data?.wellbeing_personalization_enabled === true);
      if (data?.wellbeing_personalization_enabled) {
        const { data: checkins } = await supabase.from("user_wellbeing_checkins").select("mood,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(6);
        if (active) {
          setRecentLowCheckins((checkins ?? []).filter((item) => item.mood === "low").length);
          setHasCheckedInToday((checkins ?? []).some((item) => isSameLocalCalendarDay(item.created_at)));
        }
      }
      if (active) { setWellbeingHistoryLoading(false); setWellbeingHistoryResolved(true); }
    })();
    return () => { active = false; timerStore.forEach(window.clearTimeout); };
  }, []);

  const giftPromptKey = conversationStep === "gift_status"
    ? ({ status: "giftQuestion", done: "saveDeferred", assistant_handoff: "assistantHandoff", save_prompt: "saveQuestion", input: "whatChosen", saved: "saveConfirmation", suggestion: "suggestionQuestion", declined: "dismissal" } as const)[giftStatusAction]
    : null;
  const giftPrompt = conversationStep === "gift_status"
    ? wellbeingT(giftPromptKey!, { personName: featuredEvent?.personName ?? featuredEvent?.title ?? "" })
    : null;
  // A stable, negative ID keeps the current prompt distinct from stored transcript lines.
  const promptId = -(lines.length + 1);
  const transcript = giftPrompt ? [...lines, { id: promptId, author: "happy" as const, text: giftPrompt }] : lines;
  const addUserLine = (text: string) => {
    const prompt = giftPrompt ? { id: promptId, author: "happy" as const, text: giftPrompt } : null;
    const userLine: Line = { id: nextId.current++, author: "user", text };
    setLines(current => [...current, ...(prompt ? [prompt] : []), userLine]);
  };

  const typeHappyLine = (text: string) => {
    const messages: Line[] = text.split(/\n\n+/).filter(Boolean).map(part => ({
      id: nextId.current++, author: "happy", text: part,
    }));
    setLines(current => [...current, ...messages]);
  };

  useEffect(() => {
    if (giftStatusAction !== "assistant_handoff" || !onPickGift || handoffOpenedRef.current) return;
    // The branch is already terminal. This pause only lets the user see the handoff.
    const timer = window.setTimeout(() => {
      handoffOpenedRef.current = true;
      onPickGift();
    }, 600);
    return () => window.clearTimeout(timer);
  }, [giftStatusAction, onPickGift]);

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
    setError(null);
    setHasSubmittedWellbeingResponse(true);
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
    const isBirthdayEvent = featuredEvent?.source === "birthday" || featuredEvent?.category === "birthday";
    if (isBirthdayEvent && featuredEvent) {
      const daysRemaining = featuredEvent.daysUntil;
      typeHappyLine(wellbeingT("birthdayIntro", { daysRemaining, personName: featuredEvent.personName ?? featuredEvent.title }));
      setConversationStep("birthday_intro");
      const timeout = window.setTimeout(() => setConversationStep("gift_status"), 0);
      timers.current.push(timeout);
      return;
    }
    const contextualReply = mood === "custom" ? wellbeingReply(userText ?? "", recentLowCheckins >= 2) : null;
    const reply = contextualReply ?? (mood === "custom" ? personalReply(userText ?? "", copy.customReply) : locale === "pl" ? (mood === "good" ? "Miło to słyszeć 💙" : "Rozumiem. Jestem obok 💙") : locale === "en" ? (mood === "good" ? "I’m glad to hear it 💙" : "I understand. I’m here 💙") : locale === "de" ? (mood === "good" ? "Das freut mich 💙" : "Ich verstehe. Ich bin da 💙") : locale === "ru" ? (mood === "good" ? "Рад это слышать 💙" : "Понимаю. Я рядом 💙") : (mood === "good" ? "Радий це чути 💙" : "Розумію. Я поруч 💙"));
    const eventMessage = featuredEvent ? ` ${featuredEvent.countdownLabel} ${isBirthdayEvent ? wellbeingT("birthdayLabel") : wellbeingT("importantEventLabel")} — ${featuredEvent.title}.` : ` ${wellbeingT("noEvent")}`;
    typeHappyLine(`${reply}${eventMessage}`);
  };

  const submitNote = () => {
    const value = note.trim();
    if (!value) return;
    setNote("");
    void answer("custom", value);
  };

  useEffect(() => {
    if (!enabled || !wellbeingHistoryResolved) return;
    const initializationKey = hasCheckedInToday ? "returning" : "first-time";
    if (initializedConversationStateRef.current === initializationKey) return;
    initializedConversationStateRef.current = initializationKey;
    if (!hasCheckedInToday) {
      setLines([{ id: nextId.current++, author: "happy", text: `${copy.welcome}${userName?.trim() ? `, ${userName.trim()}` : ""} 👋\n${copy.greeting}` }]);
      return;
    }
    const greeting = wellbeingT("returningGreeting", { name: userName?.trim() || "" });
    if (featuredEvent?.source === "birthday" || featuredEvent?.category === "birthday") {
      // Returning context is initialized together; gift controls must not wait on typing timers.
      setLines([
        { id: nextId.current++, author: "happy", text: greeting },
        { id: nextId.current++, author: "happy", text: wellbeingT("birthdayReturningIntro", { daysRemaining: featuredEvent.daysUntil, personName: featuredEvent.personName ?? featuredEvent.title ?? "" }) },
      ]);
      setBusy(false);
      setConversationStep("gift_status");
      return;
    }
    const eventMessage = featuredEvent ? ` ${featuredEvent.countdownLabel} ${wellbeingT("importantEventLabel")} — ${featuredEvent.title}.` : ` ${wellbeingT("noEvent")}`;
    setLines([{ id: nextId.current++, author: "happy", text: `${greeting}${eventMessage}` }]);
  }, [copy.greeting, copy.welcome, enabled, featuredEvent, hasCheckedInToday, wellbeingHistoryLoading, wellbeingHistoryResolved, wellbeingT, userName]);

  return (
    <section className="w-full max-w-[700px]" aria-label="Персональна турбота HappyDate">
      <div className="min-w-0">
          <div className="mb-4 flex items-center gap-2.5 px-1">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 text-lg shadow-sm" aria-hidden="true">✦</span>
            <div><p className="text-sm font-extrabold text-slate-900">Happy</p><p className="text-xs text-slate-500">{wellbeingT("assistantSubtitle")}</p></div>
          </div>
          {enabled === null ? <div className="mt-3 h-10 animate-pulse rounded-xl bg-slate-100" /> : !enabled ? <>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{copy.privacy}</p>
            <button type="button" onClick={() => void enableCare()} disabled={busy} className="mt-3 min-h-10 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60">{copy.consent}</button>
          </> : <>
            <ProgressiveConversation lines={transcript} waiting={busy} typingLabel={wellbeingT("typingLabel")}>
              {(ready) => <>
            {ready && conversationStep === "wellbeing" && wellbeingHistoryResolved && !hasCheckedInToday && !hasSubmittedWellbeingResponse && <>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={() => void answer("good")} className="min-h-9 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50">{copy.good}</button>
                <button type="button" disabled={busy} onClick={() => void answer("neutral")} className="min-h-9 rounded-full border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50">{copy.neutral}</button>
                <button type="button" disabled={busy} onClick={() => void answer("low")} className="min-h-9 rounded-full border border-amber-200 bg-amber-50 px-3 text-sm font-bold text-amber-900 transition hover:bg-amber-100 disabled:opacity-50">{copy.low}</button>
              </div>
              <button type="button" disabled={busy} onClick={() => void answer("skip")} className="mt-1 min-h-9 text-sm font-semibold text-slate-500 underline-offset-4 transition hover:text-slate-700 hover:underline disabled:opacity-50">{copy.skip}</button>

            </>}
            {lines.some((line) => line.author === "user") && !busy && ready && conversationStep !== "gift_status" && <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              {featuredEvent && <Link href={featuredEvent.href} className="inline-flex min-h-9 items-center rounded-xl bg-sky-600 px-3.5 font-bold text-white transition hover:bg-sky-700">{actions.view}</Link>}
              <button type="button" onClick={() => setConversationStep("wellbeing")} className="font-semibold text-slate-500 underline-offset-4 hover:text-slate-700 hover:underline">{actions.later}</button>
              <Link href="/dashboard" className="font-bold text-sky-700 underline-offset-4 hover:underline">{actions.all}</Link>
            </div>}
            {ready && conversationStep === "gift_status" && giftStatusAction === "status" && !busy && <div className="mt-4 max-w-md space-y-2">
              <div className="flex flex-wrap gap-2"><button type="button" onClick={() => { addUserLine(wellbeingT("alreadyChosen")); setGiftStatusAction("save_prompt"); }} className="min-h-9 rounded-full bg-slate-100 px-3 text-sm font-bold text-slate-700">{wellbeingT("alreadyChosen")}</button><button type="button" onClick={() => { addUserLine(wellbeingT("notYet")); setGiftStatusAction("suggestion"); }} className="min-h-9 rounded-full bg-slate-100 px-3 text-sm font-bold text-slate-700">{wellbeingT("notYet")}</button></div>
            </div>}
            {ready && conversationStep === "gift_status" && giftStatusAction === "suggestion" && <div className="mt-4 max-w-md space-y-2">
              <div className="flex flex-wrap gap-2"><button type="button" onClick={() => { addUserLine(wellbeingT("declineSuggestion")); setGiftStatusAction("declined"); }} className="min-h-9 rounded-full bg-slate-100 px-3 text-sm font-bold text-slate-700">{wellbeingT("declineSuggestion")}</button><button type="button" onClick={() => { addUserLine(wellbeingT("openAssistant")); setGiftStatusAction("assistant_handoff"); }} disabled={!onPickGift} className="min-h-9 rounded-full bg-sky-600 px-3 text-sm font-bold text-white disabled:opacity-50">{wellbeingT("openAssistant")}</button></div>
            </div>}
            {ready && conversationStep === "gift_status" && giftStatusAction === "save_prompt" && <div className="mt-4 max-w-md space-y-2">
              <p className="max-w-md text-xs leading-5 text-slate-500">{wellbeingT("saveExplanation")}</p>
              <div className="flex flex-wrap gap-2"><button type="button" onClick={() => { addUserLine(wellbeingT("saveAction")); setGiftStatusAction("input"); }} className="min-h-9 rounded-full bg-sky-600 px-3 text-sm font-bold text-white">{wellbeingT("saveAction")}</button><button type="button" onClick={() => { addUserLine(wellbeingT("laterAction")); setGiftStatusAction("done"); }} className="min-h-9 rounded-full bg-slate-100 px-3 text-sm font-bold text-slate-700">{wellbeingT("laterAction")}</button></div>
            </div>}
            {ready && conversationStep === "gift_status" && giftStatusAction === "input" && <div className="mt-4 max-w-md space-y-2">
              <button type="button" onClick={() => { addUserLine(wellbeingT("laterAction")); setGiftStatusAction("done"); }} className="min-h-9 text-sm font-semibold text-slate-500">{wellbeingT("laterAction")}</button>
            </div>}
            {giftStatusAction === "input" && conversationStep === "gift_status" ? (ready && <>
              <div className="flex gap-2"><input value={giftTitle} onChange={(event) => setGiftTitle(event.target.value)} placeholder={wellbeingT("giftInputPlaceholder")} maxLength={280} className="min-h-10 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-sky-400 focus:bg-white" /><button type="button" disabled={!giftTitle.trim() || !onSaveGift || savingGift} onClick={async () => { if (!onSaveGift) return; setSavingGift(true); try { await onSaveGift(giftTitle.trim()); addUserLine(giftTitle.trim()); setGiftTitle(""); setGiftStatusAction("saved"); } catch { setError(copy.error); } finally { setSavingGift(false); } }} className="min-h-10 shrink-0 rounded-xl bg-sky-600 px-3 text-sm font-bold text-white disabled:opacity-50">{wellbeingT("saveAction")}</button></div>
            </>) : <>
            <div className="mt-3 flex gap-2"><input value={note} onChange={(event) => setNote(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submitNote(); }} disabled={busy || !ready} maxLength={1000} placeholder={conversationStep === "wellbeing" && !hasCheckedInToday && !hasSubmittedWellbeingResponse ? wellbeingT("firstMessagePlaceholder") : wellbeingT("inputPlaceholder")} className="min-h-10 min-w-0 flex-1 rounded-full border border-slate-200 bg-white px-3.5 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50" /><button type="button" onClick={submitNote} disabled={busy || !ready || !note.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white shadow-sm disabled:opacity-40" aria-label={copy.send}><Send size={16} /></button></div>
            </>}
              </>}
            </ProgressiveConversation>
          </>}
          {error && <p role="alert" className="mt-2 text-sm font-medium text-rose-700">{error}</p>}
        </div>
    </section>
  );
}
