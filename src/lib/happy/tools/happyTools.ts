import { z, type ZodType } from "zod";

export type HappyToolLevel = "read" | "safe_internal_write" | "user_data_action";
export type HappyToolName = "get_person_context" | "get_event_context" | "get_previous_gifts" | "create_task" | "complete_task_step" | "propose_action" | "save_gift" | "save_memory" | "create_reminder";

const uuid = z.string().uuid();
const saveGift = z.object({ personId: uuid, eventId: uuid.optional(), title: z.string().trim().min(1).max(280) }).strict();
const saveMemory = z.object({ personId: uuid, content: z.string().trim().min(1).max(2_000) }).strict();
const createReminder = z.object({ eventId: uuid, occurrenceDate: z.string().date(), actionKind: z.enum(["congratulate", "prepare", "follow_up"]) }).strict();
const proposedAction = z.discriminatedUnion("type", [
  z.object({ type: z.literal("save_gift"), input: saveGift }).strict(),
  z.object({ type: z.literal("save_memory"), input: saveMemory }).strict(),
  z.object({ type: z.literal("create_reminder"), input: createReminder }).strict(),
]);

type Definition = { level: HappyToolLevel; inputSchema: ZodType };
export const HAPPY_TOOL_REGISTRY: Readonly<Record<HappyToolName, Definition>> = {
  get_person_context: { level: "read", inputSchema: z.object({ personId: uuid }).strict() },
  get_event_context: { level: "read", inputSchema: z.object({ eventId: uuid }).strict() },
  get_previous_gifts: { level: "read", inputSchema: z.object({ personId: uuid, limit: z.number().int().min(1).max(10).optional() }).strict() },
  create_task: { level: "safe_internal_write", inputSchema: z.object({ type: z.literal("birthday_preparation"), personId: uuid, eventId: uuid }).strict() },
  complete_task_step: { level: "safe_internal_write", inputSchema: z.object({ taskId: uuid, stepId: uuid }).strict() },
  propose_action: { level: "safe_internal_write", inputSchema: proposedAction },
  save_gift: { level: "user_data_action", inputSchema: saveGift },
  save_memory: { level: "user_data_action", inputSchema: saveMemory },
  create_reminder: { level: "user_data_action", inputSchema: createReminder },
};

export function getHappyToolDefinition(name: string): Definition | null { return Object.prototype.hasOwnProperty.call(HAPPY_TOOL_REGISTRY, name) ? HAPPY_TOOL_REGISTRY[name as HappyToolName] : null; }
export function getHappyToolLevel(name: string): HappyToolLevel | null { return getHappyToolDefinition(name)?.level ?? null; }
export function happyToolRequiresApproval(name: string): boolean | null { const level = getHappyToolLevel(name); return level === null ? null : level === "user_data_action"; }

export type HappyToolDecision =
  | { kind: "execute_allowed"; level: "read" | "safe_internal_write"; requiresApproval: false; parsedInput: unknown }
  | { kind: "approval_required"; level: "user_data_action"; requiresApproval: true; parsedInput: unknown }
  | { kind: "invalid_tool_call" };

/** Pure boundary. Future executors receive verifiedUserId separately; model inputs never carry ownership or policy. */
export function evaluateHappyToolCall(call: { toolName?: unknown; input?: unknown }): HappyToolDecision {
  if (typeof call.toolName !== "string") return { kind: "invalid_tool_call" };
  const definition = getHappyToolDefinition(call.toolName);
  if (!definition) return { kind: "invalid_tool_call" };
  const parsed = definition.inputSchema.safeParse(call.input);
  if (!parsed.success) return { kind: "invalid_tool_call" };
  if (definition.level === "user_data_action") return { kind: "approval_required", level: definition.level, requiresApproval: true, parsedInput: parsed.data };
  return { kind: "execute_allowed", level: definition.level, requiresApproval: false, parsedInput: parsed.data };
}
