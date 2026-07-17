"use client";

import { useState } from "react";
import { MessageCircle, Pause, Play, Volume2 } from "lucide-react";
import { useSpeechBrief } from "@/hooks/useSpeechBrief";

export default function HomeAssistantActions({ briefText, locale, labels, onAsk }: { briefText: string; locale: string; labels: { ask: string; listen: string; stop: string; read: string; briefTitle: string; close: string; speechError: string }; onAsk: () => void }) {
  const speech = useSpeechBrief(briefText, locale);
  const [showText, setShowText] = useState(false);

  const handleBrief = () => {
    if (!speech.isSupported) {
      setShowText((value) => !value);
      return;
    }
    speech.speak();
  };

  return (
    <section className="mt-4" aria-label={labels.briefTitle}>
      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={onAsk} className="hd-button min-h-12 border border-sky-100 bg-white text-sky-700 shadow-sm hover:bg-sky-50">
          <MessageCircle size={18} aria-hidden="true" /> {labels.ask}
        </button>
        <button type="button" onClick={handleBrief} className="hd-button min-h-12 border border-sky-100 bg-white text-sky-700 shadow-sm hover:bg-sky-50">
          {speech.speaking ? <Pause size={18} aria-hidden="true" /> : speech.isSupported ? <Volume2 size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
          {speech.speaking ? labels.stop : speech.isSupported ? labels.listen : labels.read}
        </button>
      </div>
      {(showText || speech.error) && (
        <div className="mt-2 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm leading-relaxed text-slate-700" role="status">
          {speech.error && <p className="mb-1 font-bold text-rose-600">{labels.speechError}</p>}
          <p>{briefText}</p>
          {showText && <button type="button" onClick={() => setShowText(false)} className="mt-2 text-xs font-extrabold text-sky-700">{labels.close}</button>}
        </div>
      )}
    </section>
  );
}
