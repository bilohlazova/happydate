"use client";

import { CalendarCheck2, CalendarDays, Gift, NotebookPen, Sparkles, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import AssistantHome from "@/components/chat-assistant/AssistantHome";
import ChatAssistantHeader from "@/components/chat-assistant/ChatAssistantHeader";
import ChatComposer from "@/components/chat-assistant/ChatComposer";
import ConversationView, { type ChatHappyLearningViewState } from "@/components/chat-assistant/ConversationView";
import type { AssistantAction, ChatMessage } from "@/components/chat-assistant/types";
import { useAssistantHomeContext } from "@/hooks/useAssistantHomeContext";
import { buildConversationHistory } from "@/lib/assistant/chatClient";
import { classifyAiAvailabilityError } from "@/lib/assistant/aiAvailability";
import { resolveChatPerson } from "@/lib/chat-person/resolveChatPerson";
import { confirmHappyLearningCandidate, requestHappyLearningDetection } from "@/lib/happy-learning/happyLearningClient";
import type { HappyLearningDetectionCandidate } from "@/lib/happy-learning/happyLearningDetectV2.types";
import { savePersonGiftLinkOnce } from "@/lib/gifts/gift.loaders";
import { supabase } from "@/lib/supabaseClient";

interface ChatAssistantModalProps {
  open: boolean;
  onClose: () => void;
  initialPrompt?: string | null;
}

const ACTION_DEFINITIONS = [
  { id: "gift", icon: Gift },
  { id: "event", icon: CalendarDays, destination: "/dashboard?action=add-event" },
  { id: "note", icon: NotebookPen, destination: "/notes?action=add-note" },
  { id: "people", icon: Users, destination: "/people" },
  { id: "dayPlan", icon: CalendarCheck2, destination: "/dashboard?action=plan-day" },
  { id: "inspiration", icon: Sparkles },
] as const;

type ChatPersonContext = {
  activePersonId: string | null;
  resolutionStatus: "none" | "resolved" | "ambiguous";
};

type ChatHappyLearningState = ChatHappyLearningViewState & {
  dismissedCandidateIds: string[];
  detectionStatus: "idle" | "loading" | "success" | "error";
};

const INITIAL_PERSON_CONTEXT: ChatPersonContext = {
  activePersonId: null,
  resolutionStatus: "none",
};

const INITIAL_HAPPY_LEARNING_STATE: ChatHappyLearningState = {
  candidates: [],
  detectedForMessageId: null,
  dismissedCandidateIds: [],
  detectionStatus: "idle",
};

export default function ChatAssistantModal({ open, onClose, initialPrompt = null }: ChatAssistantModalProps) {
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
  const [personContext, setPersonContext] = useState<ChatPersonContext>(INITIAL_PERSON_CONTEXT);
  const [happyLearning, setHappyLearning] = useState<ChatHappyLearningState>(INITIAL_HAPPY_LEARNING_STATE);
  const [giftLinkStates, setGiftLinkStates] = useState<Record<string, "saving" | "saved" | "error">>({});
  const [giftLinkTargets, setGiftLinkTargets] = useState<Record<string, string>>({});
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const homeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const happyLearningAbortRef = useRef<AbortController | null>(null);
  const happyLearningRequestRef = useRef(0);
  const shouldAutoScrollRef = useRef(true);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const messageIdRef = useRef(0);
  const localeRef = useRef(locale);

  const actions: AssistantAction[] = ACTION_DEFINITIONS.map((definition) => ({
    id: definition.id,
    icon: definition.icon,
    title: t(`actions.${definition.id}.title`),
    description: t(`actions.${definition.id}.description`),
    prompt: t(`actions.${definition.id}.prompt`),
    ...("destination" in definition && definition.destination
      ? { destination: definition.destination }
      : {}),
  }));

  const cancelActiveResponse = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    happyLearningAbortRef.current?.abort();
    happyLearningAbortRef.current = null;
    happyLearningRequestRef.current += 1;
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
    if (!open || !initialPrompt || messages.length > 0) return;
    // Seed a newly opened controlled composer without overwriting user input.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue((current) => current.trim() ? current : initialPrompt);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [initialPrompt, messages.length, open]);

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
    setPersonContext(INITIAL_PERSON_CONTEXT);
    setHappyLearning(INITIAL_HAPPY_LEARNING_STATE);
    setGiftLinkStates({});
    setGiftLinkTargets({});
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
    setPersonContext(INITIAL_PERSON_CONTEXT);
    setHappyLearning(INITIAL_HAPPY_LEARNING_STATE);
    setGiftLinkStates({});
    setGiftLinkTargets({});
    homeContext.refresh();
  }

  function selectAction(action: AssistantAction) {
    if (action.id === "gift" && personContext.resolutionStatus === "resolved" && personContext.activePersonId) {
      closeAssistant();
      router.push(`/people/${encodeURIComponent(personContext.activePersonId)}?action=add-gift-idea#gift-workspace`);
      return;
    }
    if (action.destination) {
      closeAssistant();
      const destination = (action.id === "note" || action.id === "event")
        && personContext.resolutionStatus === "resolved"
        && personContext.activePersonId
        ? `${action.destination}&personId=${encodeURIComponent(personContext.activePersonId)}`
        : action.destination;
      router.push(destination);
      return;
    }
    setValue(action.prompt);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function updatePersonContextFromUserMessage(content: string): ChatPersonContext {
    const resolution = resolveChatPerson({
      userMessage: content,
      people: homeContext.people,
      currentPersonId: personContext.activePersonId,
    });
    const next: ChatPersonContext = {
      activePersonId: resolution.status === "resolved" ? resolution.personId : null,
      resolutionStatus: resolution.status,
    };
    setPersonContext(next);
    return next;
  }

  async function detectHappyLearningCandidates(input: {
    personId: string;
    userMessage: string;
    messageId: string;
    requestId: number;
    signal: AbortSignal;
  }) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const result = accessToken
        ? await requestHappyLearningDetection({
            personId: input.personId,
            userMessage: input.userMessage,
            locale,
            accessToken,
            signal: input.signal,
          })
        : { candidates: [] };
      if (input.requestId !== happyLearningRequestRef.current || input.signal.aborted) return;
      const candidates = result.candidates.filter((candidate) => candidate.personId === input.personId).slice(0, 3);
      setHappyLearning((current) => ({
        ...current,
        candidates,
        detectedForMessageId: candidates.length ? input.messageId : null,
        detectionStatus: "success",
      }));
    } catch {
      if (input.signal.aborted || input.requestId !== happyLearningRequestRef.current) return;
      setHappyLearning((current) => ({
        ...current,
        candidates: [],
        detectedForMessageId: null,
        detectionStatus: "error",
      }));
    }
  }

  function handlePotentialHappyLearning(content: string, messageId: string): ChatPersonContext {
    const nextPersonContext = updatePersonContextFromUserMessage(content);
    happyLearningAbortRef.current?.abort();
    happyLearningAbortRef.current = null;
    happyLearningRequestRef.current += 1;
    if (nextPersonContext.resolutionStatus !== "resolved" || !nextPersonContext.activePersonId) {
      setHappyLearning((current) => ({
        ...current,
        candidates: [],
        detectedForMessageId: null,
        detectionStatus: "idle",
      }));
      return nextPersonContext;
    }

    const personId = nextPersonContext.activePersonId;
    const controller = new AbortController();
    const requestId = happyLearningRequestRef.current;
    happyLearningAbortRef.current = controller;
    setHappyLearning((current) => ({
      ...current,
      candidates: [],
      detectedForMessageId: null,
      detectionStatus: "loading",
    }));
    void detectHappyLearningCandidates({
      personId,
      userMessage: content,
      messageId,
      requestId,
      signal: controller.signal,
    });
    return nextPersonContext;
  }

  function commitFirstMessage(content: string) {
    const userMessage: ChatMessage = { id: nextMessageId(), role: "user", content, status: "complete" };
    const nextPersonContext = handlePotentialHappyLearning(content, userMessage.id);
    const assistantMessage: ChatMessage = { id: nextMessageId(), role: "assistant", content: "", status: "streaming", personId: nextPersonContext.activePersonId };
    setMessages([userMessage, assistantMessage]);
    setIsHomeExiting(false);
    homeTimerRef.current = null;
    void streamAssistantResponse(content, [], assistantMessage.id, nextPersonContext);
  }

  async function streamAssistantResponse(
    content: string,
    conversation: ReturnType<typeof buildConversationHistory>,
    assistantMessageId: string,
    requestPersonContext: ChatPersonContext = personContext,
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
            people: homeContext.isAuthenticated ? homeContext.people : [],
            memories: homeContext.isAuthenticated ? homeContext.memories : [],
            activePersonId: homeContext.isAuthenticated ? requestPersonContext.activePersonId : null,
            personResolutionStatus: homeContext.isAuthenticated ? requestPersonContext.resolutionStatus : "none",
          },
        }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const failure = await response.json().catch(() => null) as { error?: string; retryAfter?: number } | null;
        const availability = classifyAiAvailabilityError({
          status: response.status,
          error: failure?.error,
          retryAfter: failure?.retryAfter,
        });
        throw Object.assign(new Error("assistant unavailable"), availability);
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
      const retryAfter = failure.code === "rate_limited" || failure.code === "daily_ai_budget_exceeded"
        ? Number(failure.retryAfter) || 60
        : null;
      setMessages((current) => current.map((message) =>
        message.id === assistantMessageId
          ? {
              ...message,
              status: "error",
              errorCode: failure.code === "daily_ai_budget_exceeded"
                ? "daily_ai_budget_exceeded"
                : retryAfter ? "rate_limited" : "request_failed",
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
    const nextPersonContext = handlePotentialHappyLearning(content, userMessage.id);
    const assistantMessage: ChatMessage = { id: nextMessageId(), role: "assistant", content: "", status: "streaming", personId: nextPersonContext.activePersonId };
    setMessages((current) => [...current, userMessage, assistantMessage]);
    void streamAssistantResponse(content, conversation, assistantMessage.id, nextPersonContext);
  }

  function dismissHappyLearningCandidate(candidateId: string) {
    setHappyLearning((current) => ({
      ...current,
      candidates: current.candidates.filter((item) => item.id !== candidateId),
      dismissedCandidateIds: [...current.dismissedCandidateIds, candidateId],
    }));
  }

  async function saveHappyLearningCandidate(candidate: HappyLearningDetectionCandidate) {
    if (candidate.semanticStatus !== "new") return "error" as const;
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) return "error" as const;
    const result = await confirmHappyLearningCandidate({ candidate, accessToken });
    if (!result.ok) return "error" as const;
    homeContext.refresh();
    router.refresh();
    return result.status;
  }

  async function saveAssistantGiftLink(messageId: string, personId: string, url: string) {
    const ownedPerson = homeContext.people.find((person) => person.id === personId);
    if (!ownedPerson) return;
    const stateKey = `${messageId}:${url}`;
    setGiftLinkStates((current) => ({ ...current, [stateKey]: "saving" }));
    try {
      const result = await savePersonGiftLinkOnce({ personId: ownedPerson.id, giftId: null, url, title: null });
      setGiftLinkTargets((current) => ({ ...current, [stateKey]: result.linkId }));
      setGiftLinkStates((current) => ({ ...current, [stateKey]: "saved" }));
      homeContext.refresh();
      router.refresh();
    } catch {
      setGiftLinkStates((current) => ({ ...current, [stateKey]: "error" }));
    }
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
  const activePerson = personContext.activePersonId
    ? homeContext.people.find((person) => person.id === personContext.activePersonId) ?? null
    : null;

  return (
    <div className="happy-chat-backdrop fixed inset-0 z-[70] bg-slate-950/25 backdrop-blur-[3px] motion-safe:animate-[assistant-fade-in_.18s_ease-out_both]" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeAssistant()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="happy-assistant-title" tabIndex={-1} className="happy-chat-shell fixed inset-x-0 bottom-0 flex h-[min(88dvh,760px)] flex-col overflow-hidden rounded-t-[28px] border border-white/70 bg-slate-50/95 shadow-[0_24px_80px_rgba(15,23,42,0.24)] backdrop-blur-2xl outline-none motion-safe:animate-[assistant-slide-up_.22s_ease-out_both] md:bottom-6 md:left-auto md:right-6 md:h-[min(78dvh,720px)] md:w-[460px] md:rounded-[28px]">
        <ChatAssistantHeader
          title={t("title")}
          subtitle={t("subtitle")}
          status={t("status")}
          newConversationLabel={t("newConversation")}
          closeLabel={t("close")}
          onNewConversation={startNewConversation}
          onClose={closeAssistant}
        />

        {activePerson && (
          <div className="happy-chat-context">
            <Link
              href={`/people/${encodeURIComponent(activePerson.id)}`}
              onNavigate={closeAssistant}
              className="happy-chat-context__person"
              aria-label={t("context.openProfile", { name: activePerson.name })}
            >
              <span className="happy-chat-context__dot" aria-hidden="true" />
              <span>{t("context.person", { name: activePerson.name })}</span>
            </Link>
            <span className="happy-chat-context__actions">
              <button
                type="button"
                aria-label={t("context.addNote")}
                onClick={() => {
                  const noteAction = actions.find((action) => action.id === "note");
                  if (noteAction) selectAction(noteAction);
                }}
              >
                <NotebookPen aria-hidden="true" />
                <span>{t("context.addNote")}</span>
              </button>
              <button
                type="button"
                aria-label={t("context.addEvent")}
                onClick={() => {
                  const eventAction = actions.find((action) => action.id === "event");
                  if (eventAction) selectAction(eventAction);
                }}
              >
                <CalendarDays aria-hidden="true" />
                <span>{t("context.addEvent")}</span>
              </button>
              <button
                type="button"
                aria-label={t("context.giftHelp", { name: activePerson.name })}
                onClick={() => {
                  const giftAction = actions.find((action) => action.id === "gift");
                  if (giftAction) {
                    setValue(t("context.giftPrompt", { name: activePerson.name }));
                    requestAnimationFrame(() => textareaRef.current?.focus());
                  }
                }}
              >
                <Gift aria-hidden="true" />
                <span>{t("context.gift")}</span>
              </button>
            </span>
          </div>
        )}

        {messages.length === 0 ? (
          <main className="happy-chat-home min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-5 sm:px-5" aria-live="polite">
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
            dailyBudgetLabel={t("conversation.dailyBudget")}
            retryInLabel={(seconds) => t("conversation.retryIn", { seconds })}
            now={rateLimitNow || Date.now()}
            happyLearning={happyLearning}
            onRetry={retryMessage}
            onDismissHappyLearningCandidate={dismissHappyLearningCandidate}
            onSaveHappyLearningCandidate={saveHappyLearningCandidate}
            giftLinkPeople={Object.fromEntries(homeContext.people.map((person) => [person.id, person.name]))}
            giftLinkStates={giftLinkStates}
            giftLinkTargets={giftLinkTargets}
            giftLinkOpenLabel={t("giftLinks.open")}
            giftLinkSaveLabel={(name) => t("giftLinks.save", { name })}
            giftLinkSavingLabel={t("giftLinks.saving")}
            giftLinkSavedLabel={t("giftLinks.saved")}
            giftLinkViewSavedLabel={(name) => t("giftLinks.viewSaved", { name })}
            giftLinkErrorLabel={t("giftLinks.error")}
            onSaveGiftLink={saveAssistantGiftLink}
            onNavigateAway={closeAssistant}
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
