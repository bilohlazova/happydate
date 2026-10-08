import { ASSISTANT_CHAT_LIMITS, type AssistantChatRequest } from "./chatContract";
import type { HomeRepositoryResult } from "@/lib/repositories/home/home.repository";
import { resolveHomeUserName } from "@/lib/home/buildHomeViewModel";
import { orchestrateHomeBrains } from "@/lib/home/orchestrateHomeBrains";
import { removeAssistantPrivateContext, replaceAssistantContext } from "./verifiedAssistantRequest";
import { logOrchestrationEvent } from "@/lib/observability/safeLogger";
import { ASSISTANT_BEHAVIOR_MANIFEST } from "./assistantBehaviorManifest";
import { assistantLocalDate } from "./assistantLocalDate";
import { buildHappyPersonContext } from "./buildHappyPersonContext";
import { buildAssistantPeopleContext } from "./peopleContext";
import { buildAssistantMemoryContextFromSemanticMemory } from "./assistantSemanticMemoryAdapter";
import type { VerifiedChatScope } from "./chatScope";


/**
 * Replaces every client-provided private fact with an owner-scoped server
 * projection. Message, locale and bounded conversation are the only client
 * values retained.
 */
export function buildVerifiedAssistantRequest(
  request: AssistantChatRequest,
  data: HomeRepositoryResult,
  scope: VerifiedChatScope,
  currentDate = new Date(),
): AssistantChatRequest {
  const brains = orchestrateHomeBrains(data, { currentDate });
  logOrchestrationEvent(
    "assistant",
    data.errors.length ? "degraded" : "prepared",
    brains.trace,
    ASSISTANT_BEHAVIOR_MANIFEST.behaviorVersion,
  );
  const timezone = data.knowledgeReviewPreferences.timezone ?? "UTC";
  const today = assistantLocalDate(currentDate, timezone);
  const requestedPersonId = scope.type === "person" || scope.type === "event" || scope.type === "task"
    ? scope.personId
    : null;
  // An explicit owned scope always wins over the bounded global conversation list.
  const scopedPeople = requestedPersonId
    ? buildAssistantPeopleContext(data.people.filter((person) => person.id === requestedPersonId))
    : [];
  const isExplicitScope = scope.type !== "global";
  const people = isExplicitScope ? scopedPeople : brains.conversation.assistantPeople;
  const memories = isExplicitScope
    ? buildAssistantMemoryContextFromSemanticMemory({
        people,
        semanticMemory: brains.memory.semanticMemory,
        sourceKnowledge: brains.memory.safeKnowledge,
      })
    : brains.conversation.assistantMemories;
  const scopedEventId = scope.type === "event" || scope.type === "task" ? scope.eventId : null;
  const events = data.errors.some((error) => error.section === "events")
    ? []
    : data.events
      .filter((event) => scopedEventId ? event.id === scopedEventId : isExplicitScope ? event.personId === requestedPersonId : true)
      .map((event) => ({
        id: event.id,
        title: event.title.trim(),
        date: event.date.slice(0, 10),
        timeOfDay: event.timeOfDay,
        durationMinutes: event.durationMinutes,
        location: event.location?.trim().slice(0, ASSISTANT_CHAT_LIMITS.eventLocationLength) || null,
        travelBufferMinutes: event.travelBufferMinutes,
        category: event.category?.trim() || null,
      }))
      .filter((event) => event.title && /^\d{4}-\d{2}-\d{2}$/.test(event.date) && event.date >= today)
      .sort((first, second) => first.date.localeCompare(second.date)
        || (first.timeOfDay ?? "99:99").localeCompare(second.timeOfDay ?? "99:99")
        || first.title.localeCompare(second.title))
      .slice(0, ASSISTANT_CHAT_LIMITS.events);
  // Gift chooser is a separate existing global flow; it cannot widen an explicit
  // person/event/task conversation with unrelated client-selected context.
  const requestedGift = isExplicitScope ? null : request.context.giftRequest;
  const storedGiftEvent = requestedGift ? data.events.find((event) => event.id === requestedGift.eventId && event.personId === requestedGift.personId) : null;
  const birthdayPerson = requestedGift?.eventId.startsWith("birthday-") ? data.people.find((person) => requestedGift.eventId.startsWith(`birthday-${person.id}:`) && person.id === requestedGift.personId) : null;
  const birthdayOccurrenceDate = requestedGift?.eventId.split(":").at(-1) ?? null;
  const giftEvent = storedGiftEvent ?? (birthdayPerson?.birthday && birthdayOccurrenceDate && /^\d{4}-\d{2}-\d{2}$/.test(birthdayOccurrenceDate) ? { id: requestedGift!.eventId, category: "birthday", date: birthdayOccurrenceDate, personId: birthdayPerson.id } : null);
  const baseGiftContext = giftEvent ? buildHappyPersonContext(data, { id: giftEvent.id, source: giftEvent.category === "birthday" ? "birthday" : "event", date: giftEvent.date.slice(0, 10), daysUntil: Math.max(0, Math.ceil((new Date(`${giftEvent.date.slice(0, 10)}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000)), personId: giftEvent.personId }) : null;
  const selectedGift = requestedGift ? data.giftHistory?.find((gift) => gift.personId === requestedGift.personId && gift.eventId === requestedGift.eventId && (gift.lifecycle === "selected" || gift.lifecycle === "purchased")) : null;
  const giftContext = baseGiftContext ? {
    ...baseGiftContext,
    mode: requestedGift?.mode === "supplementary" && selectedGift ? "supplementary" as const : "selection" as const,
    existingSelectedGift: selectedGift ? { id: selectedGift.id, title: selectedGift.title, lifecycle: selectedGift.lifecycle as "selected" | "purchased" } : null,
  } : null;
  const scopedRequest: AssistantChatRequest = {
    ...request,
    context: {
      ...request.context,
      activePerson: requestedPersonId ? people.find((person) => person.id === requestedPersonId) ?? null : null,
      personResolutionStatus: requestedPersonId ? "resolved" : request.context.personResolutionStatus,
    },
  };
  return replaceAssistantContext(scopedRequest, {
    currentDate: today,
    userName: resolveHomeUserName(data),
    events,
    people,
    memories,
    taskContext: scope.type === "task" ? { type: scope.taskType } : null,
    giftContext,
  });
}

export function buildGuestAssistantRequest(request: AssistantChatRequest): AssistantChatRequest {
  return removeAssistantPrivateContext(request);
}
