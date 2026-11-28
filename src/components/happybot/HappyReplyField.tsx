"use client";

import { Send } from "lucide-react";

/**
 * The reply field of the embedded HappyBot on the home page. It only collects text; sending
 * hands the message to the one root-level HappyBot (useHappyBot().open), which opens over the page.
 * The AI notice is deliberately small: it says AI is used, and only after the user sends.
 */
export default function HappyReplyField({ value, onChange, onSubmit, placeholder, sendLabel, aiNotice, disabled = false }: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  sendLabel: string;
  aiNotice: string;
  disabled?: boolean;
}) {
  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing) onSubmit(); }}
          disabled={disabled}
          maxLength={1000}
          placeholder={placeholder}
          aria-label={placeholder}
          className="min-h-10 min-w-0 flex-1 rounded-full border border-slate-200 bg-white px-3.5 text-base outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50 sm:text-sm"
        />
        <button type="button" onClick={onSubmit} disabled={disabled || !value.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white shadow-sm disabled:opacity-40" aria-label={sendLabel}><Send size={16} /></button>
      </div>
      <p className="mt-1.5 px-1 text-[11px] leading-4 text-slate-500">{aiNotice}</p>
    </div>
  );
}
