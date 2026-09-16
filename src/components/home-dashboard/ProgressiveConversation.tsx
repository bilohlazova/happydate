"use client";

import { useEffect, useState, type ReactNode } from "react";

export type ConversationLine = { id: number; author: "happy" | "user"; text: string };

/** Timers reveal presentation only: they never advance the conversation state. */
export default function ProgressiveConversation({ lines, waiting, typingLabel, children }: {
  lines: ConversationLine[];
  waiting: boolean;
  typingLabel: string;
  children: (ready: boolean) => ReactNode;
}) {
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set());
  const pending = lines.find(line => line.author === "happy" && !revealed.has(line.id));
  const pendingId = pending?.id;
  const pendingText = pending?.text;

  useEffect(() => {
    if (pendingId === undefined) return;
    const delay = (pendingText?.length ?? 0) > 80 ? 750 : 450;
    const timer = window.setTimeout(() => {
      setRevealed(current => new Set([...current, pendingId]));
    }, delay);
    return () => window.clearTimeout(timer);
  }, [pendingId, pendingText]);

  const typing = Boolean(pending) || waiting;
  return <>
    <div className="mt-3 space-y-2.5" aria-live="polite" aria-relevant="additions">
      {lines.filter(line => line.author === "user" || revealed.has(line.id)).map(line => (
        <div key={line.id} className={`w-fit max-w-[78%] whitespace-pre-line break-words rounded-2xl px-3.5 py-2.5 text-[15px] leading-6 ${line.author === "happy" ? "rounded-tl-sm bg-sky-50 text-slate-700" : "ml-auto rounded-tr-sm bg-sky-100 text-slate-800"}`}>
          {line.text}
        </div>
      ))}
    </div>
    {typing && <div role="status" aria-label={typingLabel} className="mt-2.5 w-fit rounded-2xl rounded-tl-sm bg-sky-50 px-3.5 py-3">
      <span aria-hidden="true" className="flex gap-1">
        {[0, 150, 300].map(delay => <i key={delay} style={{ animationDelay: `${delay}ms` }} className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-500 motion-reduce:animate-none" />)}
      </span>
    </div>}
    {children(!typing && lines.length > 0)}
  </>;
}
