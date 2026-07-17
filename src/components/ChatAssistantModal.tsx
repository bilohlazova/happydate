"use client";

import { CalendarDays, Gift, Sparkles, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import AssistantHome from "@/components/chat-assistant/AssistantHome";
import ChatAssistantHeader from "@/components/chat-assistant/ChatAssistantHeader";
import ChatComposer from "@/components/chat-assistant/ChatComposer";
import ConversationView from "@/components/chat-assistant/ConversationView";
import type { AssistantAction, ChatMessage } from "@/components/chat-assistant/types";
import { useAssistantHomeContext } from "@/hooks/useAssistantHomeContext";
import { buildConversationHistory } from "@/lib/assistant/chatClient";
import { supabase } from "@/lib/supabaseClient";

interface ChatAssistantModalProps {
  open: boolean;
  onClose: () => void;
}

const ACTION_DEFINITIONS = [
  { id: "gift", icon: Gift },
  { id: "event", icon: CalendarDays },
  { id: "people", icon: Users },
  { id: "inspiration", icon: Sparkles },
] as const;

export default function ChatAssistantModal({ open, onClose }: ChatAssistantModalProps) {
  const t = useTranslations("assistant");
  const locale = useLocale();
  const router = useRouter();
  const homeContext = useAssistantHomeContext(open);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [value, setValue] = useState("");
  const [isResponding, setIsResponding] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [isHomeExiting, setIsHomeExiting] = useState(false);
  const [rateLimitNow, setRateLimitNow] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const homeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const messageIdRef = useRef(0);
  const localeRef = useRef(locale);

  const actions: AssistantAction[] = ACTION_DEFINITIONS.map(({ id, icon }) => ({
    id,
    icon,
    title: t(`actions.${id}.title`),
    description: t(`actions.${id}.description`),
    prompt: t(`actions.${id}.prompt`),
  }));

  const cancelActiveResponse = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    if (homeTimerRef.current) clearTimeout(homeTimerRef.current);
    homeTimerRef.current = null;
    setIsResponding(false);
    setShowTyping(false);
    setIsHomeExiting(false);
  }, []);

  const closeAssistant = useCallback(() => {
    cancelActiveResponse();
    onClose();
  }, [cancelActiveResponse, onClose]);

  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeAssistant();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialogRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      cancelActiveResponse();
      previouslyFocusedRef.current?.focus({ preventScroll: true });
    };
  }, [cancelActiveResponse, closeAssistant, open]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, [value]);

  useEffect(() => {
    if (localeRef.current === locale) return;
    localeRef.current = locale;
    cancelActiveResponse();
    setMessages([]);
    setValue("");
  }, [cancelActiveResponse, locale]);

  useEffect(() => {
    if (!messageListRef.current) return;
    if (shouldAutoScrollRef.current) {
      messageListRef.current.scrollTo({ top: messageListRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, showTyping]);

  const activeRetryAt = messages.reduce((latest, message) => Math.max(latest, message.retryAt ?? 0), 0);
  useEffect(() => {
    if (!activeRetryAt || activeRetryAt <= Date.now()) return;
    setRateLimitNow(Date.now());
    const timer = window.setInterval(() => {
      const now = Date.now();
      setRateLimitNow(now);
      if (now >= activeRetryAt) window.clearInterval(timer);
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [activeRetryAt]);

  function nextMessageId() {
    messageIdRef.current += 1;
    return `chat-message-${messageIdRef.current}`;
  }

  function startNewConversation() {
    cancelActiveResponse();
    setMessages([]);
    setValue("");
    homeContext.refresh();
  }

  function selectAction(action: AssistantAction) {
    setValue(action.prompt);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function commitFirstMessage(content: string) {
    const userMessage: ChatMessage = { id: nextMessageId(), role: "user", content, status: "complete" };
    const assistantMessage: ChatMessage = { id: nextMessageId(), role: "assistant", content: "", status: "streaming" };
    setMessages([userMessage, assistantMessage]);
    setIsHomeExiting(false);
    homeTimerRef.current = null;
    void streamAssistantResponse(content, [], assistantMessage.id);
  }

  async function streamAssistantResponse(
    content: string,
    conversation: ReturnType<typeof buildConversationHistory>,
    assistantMessageId: string,
  ) {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    shouldAutoScrollRef.current = true;
    setIsResponding(true);
    setShowTyping(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          message: content,
          locale,
          conversation,
          context: {
            userName: homeContext.isAuthenticated ? homeContext.userName : null,
            insight: homeContext.isAuthenticated && homeContext.insight
              ? {
                  title: homeContext.insight.title,
                  description: homeContext.insight.description || null,
                  state: homeContext.insight.state,
                }
              : null,
            events: homeContext.isAuthenticated ? homeContext.events : [],
          },
        }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const failure = await response.json().catch(() => null) as { error?: string; retryAfter?: number } | null;
        if (response.status === 429 && failure?.error === "rate_limited") {
          throw Object.assign(new Error("assistant rate limited"), {
            code: "rate_limited",
            retryAfter: failure.retryAfter,
          });
        }
        throw new Error("assistant request failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let receivedText = false;
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        const text = decoder.decode(chunk, { stream: true });
        if (!text) continue;
        if (!receivedText) {
          receivedText = true;
          setShowTyping(false);
        }
        setMessages((current) => current.map((message) =>
          message.id === assistantMessageId
            ? { ...message, content: message.content + text }
            : message,
        ));
      }
      setMessages((current) => [
        ...current.map((message) =>
          message.id === assistantMessageId ? { ...message, status: "complete" as const } : message,
        ),
      ]);
    } catch (error) {
      if (controller.signal.aborted) return;
      const failure = error as { code?: string; retryAfter?: number };
      const retryAfter = failure.code === "rate_limited"
        ? Math.max(1, Math.min(600, Number(failure.retryAfter) || 60))
        : null;
      setMessages((current) => current.map((message) =>
        message.id === assistantMessageId
          ? {
              ...message,
              status: "error",
              errorCode: retryAfter ? "rate_limited" : "request_failed",
              retryAt: retryAfter ? Date.now() + retryAfter * 1_000 : undefined,
            }
          : message,
      ));
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setIsResponding(false);
        setShowTyping(false);
      }
    }
  }

  function sendMessage() {
    const content = value.trim();
    if (!content || isResponding || isHomeExiting) return;
    setValue("");

    if (messages.length === 0) {
      setIsHomeExiting(true);
      homeTimerRef.current = setTimeout(() => commitFirstMessage(content), 180);
      return;
    }

    const conversation = buildConversationHistory(messages);
    const userMessage: ChatMessage = { id: nextMessageId(), role: "user", content, status: "complete" };
    const assistantMessage: ChatMessage = { id: nextMessageId(), role: "assistant", content: "", status: "streaming" };
    setMessages((current) => [...current, userMessage, assistantMessage]);
    void streamAssistantResponse(content, conversation, assistantMessage.id);
  }

  function retryMessage(assistantMessageId: string) {
    if (isResponding) return;
    const assistantIndex = messages.findIndex((message) => message.id === assistantMessageId);
    if (assistantIndex < 1) return;
    const userMessage = messages[assistantIndex - 1];
    if (userMessage.role !== "user") return;
    const conversation = buildConversationHistory(messages.slice(0, assistantIndex - 1));
    setMessages((current) => current.map((message) =>
      message.id === assistantMessageId
        ? { ...message, content: "", status: "streaming", errorCode: undefined, retryAt: undefined }
        : message,
    ));
    void streamAssistantResponse(userMessage.content, conversation, assistantMessageId);
  }

  function handleConversationScroll() {
    const container = messageListRef.current;
    if (!container) return;
    shouldAutoScrollRef.current = container.scrollHeight - container.scrollTop - container.clientHeight <= 120;
  }

  function handleComposerKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  if (!open) return null;

  const greeting = t(`greeting.${homeContext.greetingPeriod}`);
  const greetingTitle = homeContext.userName
    ? t("greeting.named", { greeting, name: homeContext.userName })
    : greeting;
  const status = homeContext.error
    ? {
        state: "calm" as const,
        title: t("home.error.title"),
        description: t("home.error.description"),
        actionLabel: null,
        actionUrl: null,
      }
    : !homeContext.isAuthenticated
      ? {
          state: "calm" as const,
          title: t("home.guest.title"),
          description: t("home.guest.description"),
          actionLabel: null,
          actionUrl: null,
        }
      : homeContext.insight
        ? homeContext.insight
        : {
            state: "calm" as const,
            title: t("home.empty.title"),
            description: t("home.empty.description"),
            actionLabel: null,
            actionUrl: null,
          };

  const statusActionUrl = status.actionUrl;
  const handleStatusAction = status.actionLabel && statusActionUrl
    ? () => {
        onClose();
        router.push(statusActionUrl);
      }
    : null;

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/25 backdrop-blur-[3px] motion-safe:animate-[assistant-fade-in_.18s_ease-out_both]" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeAssistant()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="happy-assistant-title" tabIndex={-1} className="fixed inset-x-0 bottom-0 flex h-[min(88dvh,760px)] flex-col overflow-hidden rounded-t-[28px] border border-white/70 bg-slate-50/95 shadow-[0_24px_80px_rgba(15,23,42,0.24)] backdrop-blur-2xl outline-none motion-safe:animate-[assistant-slide-up_.22s_ease-out_both] md:bottom-6 md:left-auto md:right-6 md:h-[min(78dvh,720px)] md:w-[460px] md:rounded-[28px]">
        <ChatAssistantHeader
          title={t("title")}
          subtitle={t("subtitle")}
          status={t("status")}
          newConversationLabel={t("newConversation")}
          closeLabel={t("close")}
          onNewConversation={startNewConversation}
          onClose={closeAssistant}
        />

        {messages.length === 0 ? (
          <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-5 sm:px-5" aria-live="polite">
            <AssistantHome
              greeting={greetingTitle}
              question={t("home.question")}
              statusState={status.state}
              statusTitle={status.title}
              statusDescription={status.description}
              statusLoading={homeContext.loading}
              statusLoadingLabel={t("home.loading")}
              statusActionLabel={status.actionLabel}
              onStatusAction={handleStatusAction}
              actionsLabel={t("actionsLabel")}
              actions={actions}
              exiting={isHomeExiting}
              onSelectAction={selectAction}
            />
          </main>
        ) : (
          <ConversationView
            messages={messages}
            isResponding={isResponding}
            showTyping={showTyping}
            assistantName={t("title")}
            typingLabel={t("typing")}
            scrollRef={messageListRef}
            errorLabel={t("conversation.error")}
            retryLabel={t("conversation.retry")}
            rateLimitLabel={t("conversation.rateLimited")}
            retryInLabel={(seconds) => t("conversation.retryIn", { seconds })}
            now={rateLimitNow || Date.now()}
            onRetry={retryMessage}
            onScroll={handleConversationScroll}
          />
        )}

        <ChatComposer
          value={value}
          placeholder={t("placeholder")}
          messageLabel={t("messageLabel")}
          sendLabel={t("send")}
          keyboardHint={t("keyboardHint")}
          disabled={!value.trim() || isResponding || isHomeExiting}
          textareaRef={textareaRef}
          onChange={setValue}
          onKeyDown={handleComposerKeyDown}
          onSend={sendMessage}
        />
      </div>
    </div>
  );
}
