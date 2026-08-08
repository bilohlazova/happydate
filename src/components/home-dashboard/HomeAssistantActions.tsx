"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Pause, Play, Volume2 } from "lucide-react";
import { useSpeechBrief } from "@/hooks/useSpeechBrief";
import { briefingTextForMode } from "@/lib/home/buildDailyBriefing";
import type { DailyBriefing, DailyBriefingMode } from "@/lib/home/buildDailyBriefing";

const BRIEFING_MODE_KEY = "happydate:briefing-mode";

export default function HomeAssistantActions({ briefing, locale, labels, onAsk }: { briefing: DailyBriefing; locale: string; labels: { ask: string; listen: string; pause: string; resume: string; stop: string; read: string; progress: string; interrupted: string; modeLabel: string; shortMode: string; detailedMode: string; briefTitle: string; close: string; speechError: string }; onAsk: () => void }) {
  const [mode, setMode] = useState<DailyBriefingMode>("short");
  const briefText = useMemo(() => briefingTextForMode(briefing, mode), [briefing, mode]);
  const speech = useSpeechBrief(briefText, locale);
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(BRIEFING_MODE_KEY);
      if (stored === "short" || stored === "detailed") setMode(stored);
    } catch {
      // Private browsing or device policy may disable local storage.
    }
  }, []);

  const chooseMode = (next: DailyBriefingMode) => {
    speech.cancel();
    setMode(next);
    try {
      window.localStorage.setItem(BRIEFING_MODE_KEY, next);
    } catch {
      // The selected mode still applies for the current session.
    }
  };

  const handleBrief = () => {
    if (!speech.isSupported) {
      setShowText((value) => !value);
      return;
    }
    speech.toggle();
  };

  return (
    <section className="mt-4" aria-label={labels.briefTitle}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-bold text-slate-500">{labels.modeLabel}</span>
        <div className="inline-flex rounded-xl bg-slate-100 p-1" role="group" aria-label={labels.modeLabel}>
          <button type="button" onClick={() => chooseMode("short")} aria-pressed={mode === "short"} className={`min-h-9 rounded-lg px-3 text-xs font-extrabold ${mode === "short" ? "bg-white text-sky-700 shadow-sm" : "text-slate-500"}`}>{labels.shortMode}</button>
          <button type="button" onClick={() => chooseMode("detailed")} aria-pressed={mode === "detailed"} className={`min-h-9 rounded-lg px-3 text-xs font-extrabold ${mode === "detailed" ? "bg-white text-sky-700 shadow-sm" : "text-slate-500"}`}>{labels.detailedMode}</button>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={onAsk} className="hd-button min-h-12 border border-sky-100 bg-white text-sky-700 shadow-sm hover:bg-sky-50">
          <MessageCircle size={18} aria-hidden="true" /> {labels.ask}
        </button>
        <button type="button" onClick={handleBrief} className="hd-button min-h-12 border border-sky-100 bg-white text-sky-700 shadow-sm hover:bg-sky-50" aria-pressed={speech.speaking && !speech.paused}>
          {speech.speaking && !speech.paused ? <Pause size={18} aria-hidden="true" /> : speech.paused ? <Play size={18} aria-hidden="true" /> : speech.isSupported ? <Volume2 size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
          {speech.speaking && !speech.paused ? labels.pause : speech.paused ? labels.resume : speech.isSupported ? labels.listen : labels.read}
        </button>
      </div>
      {speech.wasInterrupted && !speech.speaking && (
        <div className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900" role="status">
          {labels.interrupted}
        </div>
      )}
      {speech.speaking && (
        <div className="mt-3 rounded-2xl border border-sky-100 bg-white px-4 py-3 shadow-sm" role="status" aria-live="polite">
          <div className={`hd-brief-wave ${speech.paused ? "is-paused" : ""}`} aria-hidden="true">
            {Array.from({ length: 18 }, (_, index) => <i key={index} style={{ animationDelay: `${index * 55}ms` }} />)}
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sky-100" role="progressbar" aria-label={labels.progress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={speech.progress.percent}>
            <div className="h-full rounded-full bg-sky-500 transition-[width] duration-300" style={{ width: `${speech.progress.percent}%` }} />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <button type="button" onClick={() => setShowText((value) => !value)} className="text-xs font-extrabold text-sky-700">{labels.read}</button>
            <button type="button" onClick={speech.cancel} className="text-xs font-extrabold text-slate-500">{labels.stop}</button>
          </div>
        </div>
      )}
      {(showText || speech.error) && (
        <div className="mt-2 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm leading-relaxed text-slate-700" role="status">
          {speech.error && <p className="mb-1 font-bold text-rose-600">{labels.speechError}</p>}
          <p>{briefText}</p>
          {showText && <button type="button" onClick={() => setShowText(false)} className="mt-2 text-xs font-extrabold text-sky-700">{labels.close}</button>}
        </div>
      )}
      <style jsx>{`
        .hd-brief-wave { height: 34px; display: flex; align-items: center; justify-content: center; gap: 3px; }
        .hd-brief-wave i { width: 3px; height: 8px; border-radius: 999px; background: #0ea5e9; animation: briefWave .75s ease-in-out infinite alternate; }
        .hd-brief-wave.is-paused i { animation-play-state: paused; opacity: .55; }
        @keyframes briefWave { to { height: 30px; } }
        @media (prefers-reduced-motion: reduce) { .hd-brief-wave i { animation: none; height: 12px; } }
      `}</style>
    </section>
  );
}
