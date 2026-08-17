import type {
  AssistantChatRequest,
  AssistantEventContext,
  AssistantMemoryGroupContext,
  AssistantPersonContext,
} from "./chatContract.ts";

export type VerifiedAssistantProjection = {
  currentDate: string | null;
  userName: string | null;
  events: AssistantEventContext[];
  people: AssistantPersonContext[];
  memories: AssistantMemoryGroupContext[];
};

/** Replaces all client-supplied private facts with an owner-verified projection. */
export function replaceAssistantContext(
  request: AssistantChatRequest,
  verified: VerifiedAssistantProjection,
): AssistantChatRequest {
  const requestedPersonId = request.context.personResolutionStatus === "resolved"
    ? request.context.activePerson?.id ?? null
    : null;
  const activePerson = requestedPersonId
    ? verified.people.find(({ id }) => id === requestedPersonId) ?? null
    : null;

  return {
    message: request.message,
    locale: request.locale,
    conversation: request.conversation,
    context: {
      currentDate: verified.currentDate,
      userName: verified.userName,
      insight: null,
      events: verified.events,
      people: verified.people,
      memories: verified.memories,
      activePerson,
      personResolutionStatus: activePerson
        ? "resolved"
        : request.context.personResolutionStatus === "ambiguous" ? "ambiguous" : "none",
    },
  };
}

export function removeAssistantPrivateContext(request: AssistantChatRequest): AssistantChatRequest {
  return replaceAssistantContext(request, {
    currentDate: null,
    userName: null,
    events: [],
    people: [],
    memories: [],
  });
}
