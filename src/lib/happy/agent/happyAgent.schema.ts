import { z } from "zod";
import { happyReasonSourceRefSchema } from "../ui/happyUIBlock.ts";

const optionalUuid = z.string().uuid().optional();
export const happyAgentRequestSchema = z.object({
  intent: z.enum(["birthday_gift", "write_greeting"]),
  personId: optionalUuid,
  eventId: optionalUuid,
  taskId: optionalUuid,
  message: z.string().trim().min(1).max(2_000).optional(),
  locale: z.enum(["uk", "en", "pl", "de", "ru"]).optional().default("uk"),
  timezone: z.string().trim().min(1).max(100).optional().default("UTC"),
}).strict();

export const happyAgentBirthdayModelResultSchema = z.object({
  message: z.string().trim().min(1).max(1_500).optional(),
  idea: z.object({ title: z.string().trim().min(1).max(300), message: z.string().trim().min(1).max(1_500), reasonSources: z.array(happyReasonSourceRefSchema).min(1).max(3) }).strict().optional(),
}).strict().refine((value) => Boolean(value.message || value.idea), "empty result");

export const happyAgentGreetingModelResultSchema = z.object({
  message: z.string().trim().min(1).max(1_500),
}).strict();
