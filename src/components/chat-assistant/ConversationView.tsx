import type { RefObject } from "react";
import { MemoryCaptureCard } from "@/components/memory/MemoryCaptureCard";
import type { MemoryCaptureCandidate } from "@/lib/memory-capture";
import type { ChatMessage } from "./types";

export type ChatMemoryCaptureViewState = {
  candidates: MemoryCaptureCandidate[];
  detectedForMessageId: string | null;
  savingCandidateId: string | null;
  retryNonceByCandidateId: Record<string, number>;
  error: string | null;
};

interface ConversationViewProps {
  messages: ChatMessage[];
  isResponding: boolean;
  showTyping: boolean;
  assistantName: string;
  typingLabel: string;
  scrollRef: RefObject<HTMLDivElement | null>;
  errorLabel: string;
  retryLabel: string;
  rateLimitLabel: string;
  retryInLabel: (seconds: number) => string;
  now: number;
  memoryCapture: ChatMemoryCaptureViewState;
  onRetry: (messageId: string) => void;
  onConfirmMemoryCandidate: (candidateId: string) => void;
  onDismissMemoryCandidate: (candidateId: string) => void;
  onScroll: () => void;
}

export default function ConversationView({
  messages,
  isResponding,
  showTyping,
  assistantName,
  typingLabel,
  scrollRef,
  errorLabel,
  retryLabel,
  rateLimitLabel,
  retryInLabel,
  now,
  memoryCapture,
  onRetry,
  onConfirmMemoryCandidate,
  onDismissMemoryCandidate,
  onScroll,
}: ConversationViewProps) {
  return (
    <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-5 sm:px-5" aria-live="polite">
      <div className="space-y-4 motion-safe:animate-[assistant-conversation-in_.22s_ease-out_both]">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`whitespace-pre-wrap [overflow-wrap:anywhere] px-4 py-3 text-sm leading-6 shadow-sm ${message.role === "user" ? "max-w-[82%] rounded-[20px_20px_6px_20px] bg-sky-600 text-white" : "max-w-[85%] rounded-[20px_20px_20px_6px] border border-slate-200/80 bg-white/85 text-slate-800"}`}>
              {message.role === "assistant" && (
                <span className="mb-1 block text-[11px] font-extrabold uppercase tracking-[0.12em] text-sky-700">
                  {assistantName}
                </span>
              )}
              {message.content || (message.status === "error"
                ? message.errorCode === "rate_limited" ? rateLimitLabel : errorLabel
                : "")}
              {message.role === "assistant" && message.status === "error" && (
                <div className="mt-2 border-t border-slate-200/80 pt-2">
                  {message.content && <p className="mb-1.5 text-xs text-slate-500">{message.errorCode === "rate_limited" ? rateLimitLabel : errorLabel}</p>}
                  <button type="button" onClick={() => onRetry(message.id)} disabled={isResponding || Boolean(message.retryAt && message.retryAt > now)} className="min-h-9 rounded-xl px-2 text-xs font-extrabold text-sky-700 transition hover:bg-sky-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">
                    {message.retryAt && message.retryAt > now
                      ? retryInLabel(Math.max(1, Math.ceil((message.retryAt - now) / 1_000)))
                      : retryLabel}
                  </button>
                </div>
              )}
            </div>
            {message.id === memoryCapture.detectedForMessageId && memoryCapture.candidates.length > 0 && (
              <div className="mt-3 max-w-[92%]">
                <div className="space-y-2">
                  {memoryCapture.candidates.map((candidate) => (
                    <MemoryCaptureCard
                      key={`${candidate.id}:${memoryCapture.retryNonceByCandidateId[candidate.id] ?? 0}`}
                      candidate={candidate}
                      loading={memoryCapture.savingCandidateId === candidate.id}
                      onConfirm={onConfirmMemoryCandidate}
                      onDismiss={onDismissMemoryCandidate}
                      className="p-3 sm:p-4"
                    />
                  ))}
                </div>
                {memoryCapture.error && (
                  <p className="mt-2 rounded-2xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-rose-100">
                    {memoryCapture.error}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
        {showTyping && (
          <div className="flex justify-start" role="status">
            <div className="rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-2.5 text-xs font-semibold text-slate-500 shadow-sm">
              {typingLabel}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
