/**
 * The shared, persistence-independent boundary between HappyDate's three brains.
 *
 * Each brain receives only the output of the previous trusted stage. The
 * Conversation Brain never receives raw repository rows and can only propose
 * actions; executing a proposal belongs to the separate Action Layer.
 */
export type BrainSource = {
  id: string;
  kind: "knowledge" | "event" | "reminder" | "gift";
};

export type MemoryBrainResult<TMemory> = {
  memory: TMemory;
  sources: readonly BrainSource[];
};

export type CareBrainResult<TCare> = {
  care: TCare;
  reasonCodes: readonly string[];
  sources: readonly BrainSource[];
};

export type ConversationAction = {
  type: string;
  requiresConfirmation: true;
  payload: Readonly<Record<string, unknown>>;
};

export type ConversationBrainResult<TConversation> = {
  conversation: TConversation;
  proposedActions: readonly ConversationAction[];
};

export type ThreeBrainTrace = {
  memorySourceCount: number;
  careSourceCount: number;
  careReasonCodes: readonly string[];
  proposedActionTypes: readonly string[];
};

export type ThreeBrainResult<TMemory, TCare, TConversation> = {
  memory: TMemory;
  care: TCare;
  conversation: TConversation;
  proposedActions: readonly ConversationAction[];
  trace: ThreeBrainTrace;
};

export interface ThreeBrainServices<TRaw, TMemory, TCare, TConversation> {
  memoryBrain: (input: Readonly<TRaw>) => MemoryBrainResult<TMemory>;
  careBrain: (input: {
    memory: Readonly<TMemory>;
    sources: readonly BrainSource[];
  }) => CareBrainResult<TCare>;
  conversationBrain: (input: {
    memory: Readonly<TMemory>;
    care: Readonly<TCare>;
    reasonCodes: readonly string[];
    sources: readonly BrainSource[];
  }) => ConversationBrainResult<TConversation>;
}

function uniqueSources(sources: readonly BrainSource[]): BrainSource[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = `${source.kind}:${source.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Runs the three brains in their only permitted direction. */
export function orchestrateThreeBrains<TRaw, TMemory, TCare, TConversation>(
  rawInput: Readonly<TRaw>,
  services: ThreeBrainServices<TRaw, TMemory, TCare, TConversation>,
): ThreeBrainResult<TMemory, TCare, TConversation> {
  const memoryResult = services.memoryBrain(rawInput);
  const memorySources = uniqueSources(memoryResult.sources);
  const careResult = services.careBrain({
    memory: memoryResult.memory,
    sources: memorySources,
  });
  const careSources = uniqueSources(careResult.sources);
  const conversationResult = services.conversationBrain({
    memory: memoryResult.memory,
    care: careResult.care,
    reasonCodes: careResult.reasonCodes,
    sources: careSources,
  });

  return {
    memory: memoryResult.memory,
    care: careResult.care,
    conversation: conversationResult.conversation,
    proposedActions: conversationResult.proposedActions,
    trace: {
      memorySourceCount: memorySources.length,
      careSourceCount: careSources.length,
      careReasonCodes: [...careResult.reasonCodes],
      proposedActionTypes: conversationResult.proposedActions.map(({ type }) => type),
    },
  };
}
