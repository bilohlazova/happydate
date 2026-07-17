"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { buildInsights } from "@/lib/brain/buildInsights";
import { mapInsightToAssistant, type AssistantCardData } from "@/lib/brain/mapInsightToAssistant";
import type { BrainEvent } from "@/lib/brain/types";
import { resolveHomeUserName } from "@/lib/home/buildHomeViewModel";
import { getHomeData } from "@/lib/repositories/home/home.repository";
import type { AssistantEventContext } from "@/lib/assistant/chatContract";
import type { AssistantPersonContext } from "@/lib/assistant/chatContract";
import { buildAssistantPeopleContext } from "@/lib/assistant/peopleContext";
import type { AssistantMemoryGroupContext } from "@/lib/assistant/chatContract";
import { buildAssistantMemoryContext } from "@/lib/assistant/memoryContext";
import { getCurrentMemoryUserId } from "@/lib/repositories/memoryRepository";
import { listKnowledge } from "@/lib/repositories/knowledgeRepository";

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

function toBrainEvents(
  events: Awaited<ReturnType<typeof getHomeData>>["events"],
): BrainEvent[] {
  return events.map((event) => {
    const category = event.category?.trim().toLowerCase() || null;
    return {
      id: event.id,
      title: event.title,
      date: event.date,
      is_important: category === "birthday" || category === "anniversary",
      person_name: null,
      category,
    };
  });
}

function toAssistantEvents(
  events: Awaited<ReturnType<typeof getHomeData>>["events"],
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
      category: event.category?.trim() || null,
    }))
    .filter((event) => /^\d{4}-\d{2}-\d{2}$/.test(event.date) && event.date >= today)
    .sort((first, second) => first.date.localeCompare(second.date) || first.title.localeCompare(second.title))
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
    setContext((current) => ({
      ...current,
      greetingPeriod: getGreetingPeriod(),
      loading: true,
      error: null,
    }));

    const loadMemories = async () => {
      const userId = await getCurrentMemoryUserId();
      // Preserve the existing Assistant ordering/limit behavior in
      // buildAssistantMemoryContext; purpose-specific retrieval comes later.
      return userId ? listKnowledge({ userId }) : [];
    };

    void Promise.all([
      getHomeData(),
      loadMemories().catch(() => []),
    ])
      .then(([data, brainMemories]) => {
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

        const [nextInsight] = buildInsights({
          events: toBrainEvents(data.events),
          currentDate: new Date(),
          eventTranslate: (key, values) => insightT(key, values),
        });

        const assistantPeople = data.errors.some((error) => error.section === "people")
          ? []
          : buildAssistantPeopleContext(data.people);
        setContext({
          userName: resolveHomeUserName(data),
          greetingPeriod: getGreetingPeriod(),
          insight: mapInsightToAssistant(nextInsight ?? null),
          events: toAssistantEvents(data.events),
          people: assistantPeople,
          memories: buildAssistantMemoryContext(assistantPeople, brainMemories),
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
