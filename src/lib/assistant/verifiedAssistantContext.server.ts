import { ASSISTANT_CHAT_LIMITS, type AssistantChatRequest } from "./chatContract";
import type { HomeRepositoryResult } from "@/lib/repositories/home/home.repository";
import { resolveHomeUserName } from "@/lib/home/buildHomeViewModel";
import { orchestrateHomeBrains } from "@/lib/home/orchestrateHomeBrains";
import { removeAssistantPrivateContext, replaceAssistantContext } from "./verifiedAssistantRequest";
import { logOrchestrationEvent } from "@/lib/observability/safeLogger";
import { ASSISTANT_BEHAVIOR_MANIFEST } from "./assistantBehaviorManifest";
import { assistantLocalDate } from "./assistantLocalDate";


/**
 * Replaces every client-provided private fact with an owner-scoped server
 * projection. Message, locale and bounded conversation are the only client
 * values retained.
 */
export function buildVerifiedAssistantRequest(
  request: AssistantChatRequest,
  data: HomeRepositoryResult,
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
  const events = data.errors.some((error) => error.section === "events")
    ? []
    : data.events
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
  return replaceAssistantContext(request, {
    currentDate: today,
    userName: resolveHomeUserName(data),
    events,
    people: brains.conversation.assistantPeople,
    memories: brains.conversation.assistantMemories,
  });
}

export function buildGuestAssistantRequest(request: AssistantChatRequest): AssistantChatRequest {
  return removeAssistantPrivateContext(request);
}
