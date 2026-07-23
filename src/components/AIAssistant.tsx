"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

export interface HappyEvent {
  id: string;
  title: string;
  date: string;
  person_name?: string | null;
  relation?: string | null;
  is_important?: boolean;
}

interface AIAssistantProps {
  userName?: string;
  events?: HappyEvent[];
}

export default function AIAssistant({
  userName,
  events = [],
}: AIAssistantProps) {
  const t = useTranslations("assistant.legacyPanel");
  const locale = useLocale();
  const displayName = userName ?? t("userFallback");
  const [greeting, setGreeting]   = useState(t("greeting.morning"));
  const [subtext,  setSubtext]    = useState("");
  const [speaking, setSpeaking]   = useState(false);
  const [blinking, setBlinking]   = useState(false);
  const blinkRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── greeting by hour ── */
  useEffect(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) {
      setGreeting(t("greeting.morning"));
      setSubtext(t("subtext.morning"));
    } else if (h >= 12 && h < 18) {
      setGreeting(t("greeting.afternoon"));
      setSubtext(t("subtext.afternoon"));
    } else if (h >= 18 && h < 22) {
      setGreeting(t("greeting.evening"));
      setSubtext(t("subtext.evening"));
    } else {
      setGreeting(t("greeting.night"));
      setSubtext(t("subtext.night"));
    }
  }, [t]);

  /* ── random blink ── */
  useEffect(() => {
    const schedule = () => {
      const delay = 2500 + Math.random() * 3500;
      blinkRef.current = setTimeout(() => {
        setBlinking(true);
        setTimeout(() => { setBlinking(false); schedule(); }, 120);
      }, delay);
    };
    schedule();
    return () => { if (blinkRef.current) clearTimeout(blinkRef.current); };
  }, []);

  /* ── upcoming events (next 14 days, important first) ── */
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = [...events]
    .filter((e) => {
      const d = new Date(e.date);
      d.setHours(0, 0, 0, 0);
      const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
      return diff >= 0 && diff <= 14;
    })
    .sort((a, b) => {
      if (a.is_important && !b.is_important) return -1;
      if (!a.is_important && b.is_important)  return  1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

  const importantEvent = upcoming.find((e) => e.is_important) ?? upcoming[0];

  /* ── day label ── */
  function dayLabel(dateStr: string) {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
    if (diff === 0) return t("day.today");
    if (diff === 1) return t("day.tomorrow");
    return t("day.days", { count: diff });
  }

  function chipClass(dateStr: string) {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
    if (diff === 0) return "bg-[#4A9FE8] text-white";
    if (diff <= 3)  return "bg-[#e8f4fd] text-[#2d7ec4] border border-[#4A9FE8]/20";
    return "bg-gray-100 text-gray-400 border border-gray-200";
  }

  /* ── speech ── */
  const buildText = useCallback(() => {
    const name = displayName;
    const count = upcoming.length;
    const imp = importantEvent;
    return [
      `${greeting}, ${name}!`,
      count > 0
        ? t("speech.eventCount", { count })
        : t("speech.noEvents"),
      imp ? t("speech.important", { title: imp.title }) : "",
      t("speech.allGood"),
    ].filter(Boolean).join(" ");
  }, [displayName, greeting, importantEvent, t, upcoming]);

  function handleSpeak() {
    if (!("speechSynthesis" in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(buildText());
    u.lang    = locale;
    u.rate    = 0.88;
    u.pitch   = 0.95;
    u.onstart = () => setSpeaking(true);
    u.onend   = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }

  /* ── bar heights ── */
  const barHeights = [3, 9, 5, 11, 4];

  return (
    <div className="bg-white rounded-2xl overflow-hidden mb-2 shadow-sm border border-gray-100">

      {/* ── TOP: ORB + GREETING ── */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-4 mb-4">

          {/* ORB */}
          <div className="relative flex-shrink-0 w-16 h-16">
            {/* pulse rings */}
            <div
              className="absolute rounded-full border border-[#4A9FE8]/20"
              style={{ inset: "-8px", animation: "hdRing 3.5s ease-in-out infinite" }}
            />
            <div
              className="absolute rounded-full border border-[#4A9FE8]/08"
              style={{ inset: "-18px", animation: "hdRing 3.5s ease-in-out infinite 1s" }}
            />
            {/* orb body */}
              <button
              onClick={handleSpeak}
              aria-label={speaking ? t("aria.stop") : t("aria.start")}
              className="w-16 h-16 rounded-full relative overflow-hidden flex items-center justify-center cursor-pointer border-none"
              style={{
                background: "linear-gradient(145deg,#2d7ec4 0%,#4A9FE8 50%,#74b8f0 100%)",
                animation: "hdBreathe 4s ease-in-out infinite",
                boxShadow: speaking
                  ? "0 4px 40px rgba(74,159,232,0.65),0 0 50px rgba(74,159,232,0.2)"
                  : "0 4px 18px rgba(74,159,232,0.3),0 1px 4px rgba(0,0,0,0.06)",
                transition: "box-shadow 0.3s",
              }}
            >
              {/* glass shine */}
              <div
                className="absolute rounded-full pointer-events-none"
                style={{
                  top: "-20%", left: "-10%",
                  width: "55%", height: "50%",
                  background: "rgba(255,255,255,0.28)",
                }}
              />
              {/* voice bars */}
              <div className="flex items-center gap-0.5 z-10 relative">
                {barHeights.map((h, i) => (
                  <div
                    key={i}
                    className="w-0.5 rounded-full bg-white"
                    style={{
                      height: `${h}px`,
                      opacity: speaking ? 1 : 0.35,
                      transform: blinking ? "scaleY(0.08)" : "scaleY(1)",
                      transition: "transform 0.07s",
                      animation: speaking
                        ? `hdBarSpeak 0.45s ease-in-out infinite ${i * 0.08}s`
                        : `hdBarIdle 2.5s ease-in-out infinite ${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            </button>
          </div>

          {/* TEXT */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <div
                className="w-1.5 h-1.5 rounded-full bg-[#4A9FE8]"
                style={{ animation: "hdDot 2s ease-in-out infinite" }}
              />
              <span className="text-[10px] font-semibold tracking-widest text-[#4A9FE8] uppercase">
                HappyDate AI
              </span>
            </div>
            <p className="text-[19px] font-bold text-gray-900 leading-snug tracking-tight mb-0.5">
              {greeting}, {displayName} 💛
            </p>
            <p className="text-[13px] text-gray-400 font-light italic leading-snug">
              {subtext}
            </p>
          </div>
        </div>

        {/* ── IMPORTANT EVENT ALERT ── */}
        {importantEvent && (
          <div className="flex items-center gap-3 bg-[#e8f4fd] rounded-2xl px-4 py-3.5 mb-4 border border-[#4A9FE8]/12">
            <div className="w-0.5 h-10 bg-[#4A9FE8] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-gray-900 leading-snug">
                {importantEvent.title}
              </p>
              {importantEvent.person_name && (
                <p className="text-[12px] text-gray-400 font-light italic mt-0.5">
                  {importantEvent.person_name}
                  {importantEvent.relation ? ` · ${importantEvent.relation}` : ""}
                  {t("event.phonePrompt")}
                </p>
              )}
            </div>
            <span className="text-[11px] font-bold text-white bg-[#4A9FE8] px-3 py-1 rounded-full flex-shrink-0">
              {t("event.now")}
            </span>
          </div>
        )}

        {/* ── LISTEN BUTTON ── */}
        <button
          onClick={handleSpeak}
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-[14px] text-white mb-2.5 active:scale-[0.97] transition-transform duration-150 border-none cursor-pointer"
          style={{
            background: speaking
              ? "linear-gradient(135deg,#7B61FF 0%,#4A9FE8 100%)"
              : "linear-gradient(135deg,#4A9FE8 0%,#7B61FF 100%)",
            boxShadow: speaking
              ? "0 6px 24px rgba(123,97,255,0.4)"
              : "0 6px 24px rgba(74,159,232,0.35)",
            transition: "background 0.3s, box-shadow 0.3s",
          }}
        >
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.2)" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              {speaking ? (
                <>
                  <line x1="6" y1="4" x2="6" y2="20" />
                  <line x1="18" y1="4" x2="18" y2="20" />
                </>
              ) : (
                <>
                  <path d="M12 1a3 3 0 0 1 3 3v8a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                </>
              )}
            </svg>
          </span>
          {speaking ? t("listen.stop") : t("listen.start")}
        </button>

        {/* ── QUICK ACTIONS ── */}
        <div className="grid grid-cols-3 gap-2">
          {([
            {
              label: t("nav.calendar"), href: "/calendar",
              icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
            },
            {
              label: t("nav.people"), href: "/people",
              icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
            },
            {
              label: t("nav.notes"), href: "/notes",
              icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>,
            },
          ] as const).map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-gray-100 active:scale-95 transition-all no-underline"
            >
              <span className="w-8 h-8 rounded-[10px] bg-white border border-gray-100 flex items-center justify-center text-gray-400">
                {a.icon}
              </span>
              <span className="text-[11px] font-medium text-gray-500">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── EVENTS LIST ── */}
      {upcoming.length > 0 && (
        <div className="border-t border-gray-50 px-5 py-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-bold tracking-widest text-gray-300 uppercase">
              {t("upcoming.title")}
            </span>
            <Link href="/calendar" className="text-[12px] font-semibold text-[#4A9FE8] no-underline">
              {t("upcoming.all")}
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {upcoming.slice(0, 3).map((ev) => {
              const d = new Date(ev.date);
              return (
                <div
                  key={ev.id}
                  className="flex items-center gap-3 px-3.5 py-3 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative overflow-hidden"
                >
                  {ev.is_important && (
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#4A9FE8]" />
                  )}
                  <div className="min-w-[34px] text-center flex-shrink-0 pl-1">
                    <div className="text-[20px] font-extrabold text-gray-900 leading-none">
                      {d.getDate()}
                    </div>
                    <div className="text-[9px] font-semibold tracking-wider uppercase text-gray-300 mt-0.5">
                      {new Intl.DateTimeFormat(locale, { month: "short" }).format(d)}
                    </div>
                  </div>
                  <div className="w-px h-7 bg-gray-100 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-gray-900 truncate">
                      {ev.title}
                    </div>
                    {ev.person_name && (
                      <div className="text-[11px] font-light text-gray-300 italic mt-0.5">
                        {ev.person_name}
                        {ev.relation ? ` · ${ev.relation}` : ""}
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${chipClass(ev.date)}`}>
                    {dayLabel(ev.date)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CSS KEYFRAMES ── */}
      <style>{`
        @keyframes hdBreathe {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.04); }
        }
        @keyframes hdRing {
          0%, 100% { opacity: .5; transform: scale(1); }
          50%       { opacity: 1;  transform: scale(1.02); }
        }
        @keyframes hdBarIdle {
          0%, 100% { transform: scaleY(1);   opacity: .3; }
          50%       { transform: scaleY(1.7); opacity: 1;  }
        }
        @keyframes hdBarSpeak {
          0%, 100% { transform: scaleY(1);   }
          50%       { transform: scaleY(4.5); }
        }
        @keyframes hdDot {
          0%, 100% { opacity: 1;  transform: scale(1);   }
          50%       { opacity: .3; transform: scale(0.7); }
        }
      `}</style>
    </div>
  );
}
