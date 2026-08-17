"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { mapInsightToAssistant, type AssistantCardData } from "@/lib/brain/mapInsightToAssistant";
import { resolveHomeUserName } from "@/lib/home/buildHomeViewModel";
import { loadHome } from "@/lib/home/loadHome";
import type { AssistantEventContext } from "@/lib/assistant/chatContract";
import type { AssistantPersonContext } from "@/lib/assistant/chatContract";
import type { AssistantMemoryGroupContext } from "@/lib/assistant/chatContract";

export type GreetingPeriod = "morning" | "afternoon" | "evening" | "night";

export type AssistantHomeContext = {
  userName: string | null;
  greetingPeriod: GreetingPeriod;
  insight: AssistantCardData | null;
  events: AssistantEventContext[];
  people: AssistantPersonContext[];
  memories: AssistantMemoryGroupContext[];
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

function getGreetingPeriod(date = new Date()): GreetingPeriod {
  const hour = date.getHours();
  if (hour >= 5 && hour <= 11) return "morning";
  if (hour >= 12 && hour <= 17) return "afternoon";
  if (hour >= 18 && hour <= 22) return "evening";
  return "night";
}

function toAssistantEvents(
  events: Awaited<ReturnType<typeof loadHome>>["events"],
  now = new Date(),
): AssistantEventContext[] {
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  return events
    .map((event) => ({
      id: event.id,
      title: event.title,
      date: event.date.slice(0, 10),
      timeOfDay: event.timeOfDay ?? null,
      durationMinutes: event.durationMinutes ?? null,
      location: event.location?.trim().slice(0, 300) || null,
      travelBufferMinutes: event.travelBufferMinutes ?? null,
      category: event.category?.trim() || null,
    }))
    .filter((event) => /^\d{4}-\d{2}-\d{2}$/.test(event.date) && event.date >= today)
    .sort((first, second) => first.date.localeCompare(second.date)
      || (first.timeOfDay ?? "99:99").localeCompare(second.timeOfDay ?? "99:99")
      || first.title.localeCompare(second.title))
    .slice(0, 10);
}

const INITIAL_CONTEXT: AssistantHomeContext = {
  userName: null,
  greetingPeriod: "morning",
  insight: null,
  events: [],
  people: [],
  memories: [],
  isAuthenticated: false,
  loading: true,
  error: null,
  refresh: () => {},
};

export function useAssistantHomeContext(open: boolean): AssistantHomeContext {
  const locale = useLocale();
  const insightT = useTranslations("assistant.insight");
  const [context, setContext] = useState<AssistantHomeContext>(INITIAL_CONTEXT);
  const [refreshKey, setRefreshKey] = useState(0);
  const requestIdRef = useRef(0);
  const refresh = useCallback(() => setRefreshKey((current) => current + 1), []);

  useEffect(() => {
    if (!open) return;
    const requestId = ++requestIdRef.current;
    // Opening or refreshing starts a new asynchronous context snapshot.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContext((current) => ({
      ...current,
      greetingPeriod: getGreetingPeriod(),
      loading: true,
      error: null,
    }));

    void loadHome({
      eventTranslate: (key, values) => insightT(key, values),
    })
      .then((data) => {
        if (requestId !== requestIdRef.current) return;

        if (!data.isAuthenticated) {
          setContext({
            userName: null,
            greetingPeriod: getGreetingPeriod(),
            insight: null,
            events: [],
            people: [],
            memories: [],
            isAuthenticated: false,
            loading: false,
            error: null,
            refresh,
          });
          return;
        }

        const eventsFailed = data.errors.some((error) => error.section === "events");
        if (eventsFailed) {
          setContext({
            userName: resolveHomeUserName(data),
            greetingPeriod: getGreetingPeriod(),
            insight: null,
            events: [],
            people: [],
            memories: [],
            isAuthenticated: true,
            loading: false,
            error: "assistant-home-context-unavailable",
            refresh,
          });
          return;
        }

        const [nextInsight] = data.brainInsights;

        setContext({
          userName: resolveHomeUserName(data),
          greetingPeriod: getGreetingPeriod(),
          insight: mapInsightToAssistant(nextInsight ?? null),
          events: toAssistantEvents(data.events),
          people: data.assistantPeople,
          memories: data.assistantMemories,
          isAuthenticated: true,
          loading: false,
          error: null,
          refresh,
        });
      })
      .catch(() => {
        if (requestId !== requestIdRef.current) return;
        setContext({
          userName: null,
          greetingPeriod: getGreetingPeriod(),
          insight: null,
          events: [],
          people: [],
          memories: [],
          isAuthenticated: false,
          loading: false,
          error: "assistant-home-context-unavailable",
          refresh,
        });
      });

    return () => {
      requestIdRef.current += 1;
    };
  }, [insightT, locale, open, refresh, refreshKey]);

  return { ...context, refresh };
}
