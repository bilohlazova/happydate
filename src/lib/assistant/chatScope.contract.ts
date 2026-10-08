import { z } from "zod";

const uuid = z.string().uuid();

/** The only client-controlled chat target: one root resource, never a relationship graph. */
export const chatScopeInputSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("global") }).strict(),
  z.object({ type: z.literal("person"), personId: uuid }).strict(),
  z.object({ type: z.literal("event"), eventId: uuid }).strict(),
  z.object({ type: z.literal("task"), taskId: uuid }).strict(),
]);

export type ChatScopeInput = z.infer<typeof chatScopeInputSchema>;
