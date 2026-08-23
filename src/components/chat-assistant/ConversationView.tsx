import type { RefObject } from "react";
import { Check, ExternalLink, LoaderCircle, Save } from "lucide-react";
import Link from "next/link";
import { HappyLearningCard } from "@/components/memory/HappyLearningCard";
import { extractAssistantGiftLinks, giftLinkHost } from "@/lib/gifts/assistantGiftLinks";
import type { HappyLearningDetectionCandidate } from "@/lib/happy-learning/happyLearningDetectV2.types";
import type { ChatMessage } from "./types";

export type ChatHappyLearningViewState = {
  candidates: HappyLearningDetectionCandidate[];
  detectedForMessageId: string | null;
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
  dailyBudgetLabel: string;
  retryInLabel: (seconds: number) => string;
  now: number;
  happyLearning: ChatHappyLearningViewState;
  onRetry: (messageId: string) => void;
  onDismissHappyLearningCandidate: (candidateId: string) => void;
  onSaveHappyLearningCandidate: (candidate: HappyLearningDetectionCandidate) => Promise<"created" | "already_known" | "error">;
  giftLinkPeople: Record<string, string>;
  giftLinkStates: Record<string, "saving" | "saved" | "error">;
  giftLinkTargets: Record<string, string>;
  giftLinkOpenLabel: string;
  giftLinkSaveLabel: (name: string) => string;
  giftLinkSavingLabel: string;
  giftLinkSavedLabel: string;
  giftLinkViewSavedLabel: (name: string) => string;
  giftLinkErrorLabel: string;
  onSaveGiftLink: (messageId: string, personId: string, url: string) => void;
  onNavigateAway: () => void;
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
  dailyBudgetLabel,
  retryInLabel,
  now,
  happyLearning,
  onRetry,
  onDismissHappyLearningCandidate,
  onSaveHappyLearningCandidate,
  giftLinkPeople,
  giftLinkStates,
  giftLinkTargets,
  giftLinkOpenLabel,
  giftLinkSaveLabel,
  giftLinkSavingLabel,
  giftLinkSavedLabel,
  giftLinkViewSavedLabel,
  giftLinkErrorLabel,
  onSaveGiftLink,
  onNavigateAway,
  onScroll,
}: ConversationViewProps) {
  return (
    <div ref={scrollRef} onScroll={onScroll} className="happy-chat-conversation min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-5 sm:px-5" aria-live="polite">
      <div className="space-y-4 motion-safe:animate-[assistant-conversation-in_.22s_ease-out_both]">
        {messages.map((message) => {
          const giftLinkPersonId = message.personId ?? null;
          const giftLinkPersonName = giftLinkPersonId ? giftLinkPeople[giftLinkPersonId] ?? null : null;
          const giftLinks = message.role === "assistant" && message.status === "complete" && giftLinkPersonName
            ? extractAssistantGiftLinks(message.content)
            : [];
          return (
          <div key={message.id} className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}>
            <div className={`happy-chat-message happy-chat-message--${message.role} whitespace-pre-wrap [overflow-wrap:anywhere] px-4 py-3 text-sm leading-6 shadow-sm ${message.role === "user" ? "max-w-[82%] rounded-[20px_20px_6px_20px] bg-sky-600 text-white" : "max-w-[85%] rounded-[20px_20px_20px_6px] border border-slate-200/80 bg-white/85 text-slate-800"}`}>
              {message.role === "assistant" && (
                <span className="mb-1 block text-[11px] font-extrabold uppercase tracking-[0.12em] text-sky-700">
                  {assistantName}
                </span>
              )}
              {message.content || (message.status === "error"
                ? message.errorCode === "daily_ai_budget_exceeded" ? dailyBudgetLabel : message.errorCode === "rate_limited" ? rateLimitLabel : errorLabel
                : "")}
              {message.role === "assistant" && message.status === "error" && (
                <div className="mt-2 border-t border-slate-200/80 pt-2">
                  {message.content && <p className="mb-1.5 text-xs text-slate-500">{message.errorCode === "daily_ai_budget_exceeded" ? dailyBudgetLabel : message.errorCode === "rate_limited" ? rateLimitLabel : errorLabel}</p>}
                  <button type="button" onClick={() => onRetry(message.id)} disabled={isResponding || Boolean(message.retryAt && message.retryAt > now)} className="min-h-9 rounded-xl px-2 text-xs font-extrabold text-sky-700 transition hover:bg-sky-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">
                    {message.retryAt && message.retryAt > now
                      ? retryInLabel(Math.max(1, Math.ceil((message.retryAt - now) / 1_000)))
                      : retryLabel}
                  </button>
                </div>
              )}
            </div>
            {giftLinkPersonId && giftLinkPersonName && giftLinks.length > 0 && (
              <div className="mt-2 w-full max-w-[92%] space-y-2" aria-label={giftLinkSaveLabel(giftLinkPersonName)}>
                {giftLinks.map((url) => {
                  const stateKey = `${message.id}:${url}`;
                  const state = giftLinkStates[stateKey];
                  const savedLinkId = giftLinkTargets[stateKey] ?? null;
                  return (
                    <div key={url} className="rounded-2xl border border-amber-200/80 bg-amber-50/90 p-3 shadow-sm">
                      <a href={url} target="_blank" rel="noopener noreferrer" className="flex min-h-10 items-center gap-2 rounded-xl px-1 text-sm font-extrabold text-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">
                        <span className="min-w-0 flex-1 truncate">{giftLinkHost(url)}</span>
                        <span className="sr-only">{giftLinkOpenLabel}</span>
                        <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                      </a>
                      <button type="button" disabled={state === "saving" || state === "saved"} onClick={() => onSaveGiftLink(message.id, giftLinkPersonId, url)} className="mt-1 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-white px-3 text-xs font-extrabold text-amber-800 ring-1 ring-amber-200 transition hover:bg-amber-100 disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
                        {state === "saving" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : state === "saved" ? <Check className="h-4 w-4" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                        {state === "saving" ? giftLinkSavingLabel : state === "saved" ? giftLinkSavedLabel : giftLinkSaveLabel(giftLinkPersonName)}
                      </button>
                      {state === "saved" && (
                        <Link href={`/people/${encodeURIComponent(giftLinkPersonId)}#${savedLinkId ? `gift-link-${encodeURIComponent(savedLinkId)}` : "gift-workspace"}`} onNavigate={onNavigateAway} className="mt-2 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 text-xs font-extrabold text-white transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2">
                          {giftLinkViewSavedLabel(giftLinkPersonName)}
                          <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      )}
                      {state === "error" && <p role="alert" className="mt-2 text-xs font-semibold text-rose-700">{giftLinkErrorLabel}</p>}
                    </div>
                  );
                })}
              </div>
            )}
            {message.id === happyLearning.detectedForMessageId && happyLearning.candidates.length > 0 && (
              <div className="mt-3 max-w-[92%]">
                <div className="space-y-2">
                  {happyLearning.candidates.map((candidate) => (
                    <HappyLearningCard
                      key={candidate.id}
                      candidate={candidate}
                      onDismiss={onDismissHappyLearningCandidate}
                      onSave={onSaveHappyLearningCandidate}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          );
        })}
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
