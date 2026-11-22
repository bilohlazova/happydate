import "server-only";
import { createMemoryProposalFromCandidate, type MemoryProposalResult } from "@/lib/happy/actions/memoryProposal.server";

/**
 * The single entry to Happy's "I learned something new" queue.
 *
 * Every way Happy can notice a new stable fact about a person (a chat tool call,
 * a fact extracted while summarizing older conversations, a gift-discovery
 * answer) ends here and becomes the same thing: a pending `save_memory` action
 * that the user approves or rejects. Nothing becomes Knowledge without that
 * explicit confirmation, and the fact must be literally present in the user's
 * own words (`sourceText`).
 */
export type KnowledgeCandidateSource = "chat_tool" | "conversation_summary" | "gift_discovery";

export async function queueKnowledgeCandidate(input: {
  userId: string;
  /** Server-verified person the fact is about. Never taken from model output. */
  personId: string;
  taskId?: string | null;
  content: string;
  /** Defaults to a stable fact; the proposal boundary rejects anything that is not. */
  kind?: "general_person_knowledge" | "task_local" | "uncertain" | "do_not_remember";
  /** The user's own message(s) that contain `content`. */
  sourceText: string;
  source: KnowledgeCandidateSource;
}): Promise<MemoryProposalResult> {
  return createMemoryProposalFromCandidate({
    userId: input.userId,
    scope: input.taskId
      ? { type: "task", userId: input.userId, taskId: input.taskId, personId: input.personId, eventId: null, taskType: "queued" }
      : { type: "person", userId: input.userId, personId: input.personId },
    currentUserMessage: input.sourceText,
    candidate: { kind: input.kind ?? "general_person_knowledge", content: input.content },
  });
}
