import { z } from "zod";
import type { HappyAgentIntentContext } from "../agent-context/happyAgentIntentContext.types";
import type { HappyTaskCardModel } from "../task-ui/happyTaskCard.ts";

export const happyReasonSourceRefSchema = z.discriminatedUnion("type", [z.object({ type: z.literal("knowledge"), id: z.string().uuid() }).strict(), z.object({ type: z.literal("memory"), id: z.string().uuid() }).strict(), z.object({ type: z.literal("gift"), id: z.string().uuid() }).strict()]);
export type HappyReasonSourceRef = z.infer<typeof happyReasonSourceRefSchema>;
const reason = z.object({ source: happyReasonSourceRefSchema, sourceType: z.enum(["preference", "fact", "memory", "gift_history"]), label: z.string().trim().min(1).max(500) }).strict();
const gift = z.object({ type: z.literal("gift_recommendation"), gift: z.object({ title: z.string().trim().min(1).max(300), description: z.string().trim().min(1).max(1500).optional() }).strict(), reasons: z.array(reason).min(1).max(3), actions: z.array(z.enum(["save", "dismiss", "more_like_this"])).length(3) }).strict();
const task = z.object({ type: z.literal("task_progress"), taskId: z.string().uuid(), title: z.string().trim().min(1).max(300), event: z.object({ date: z.string().date(), daysUntil: z.number().int() }).strict(), progress: z.object({ completed: z.number().int().nonnegative(), total: z.number().int().positive() }).strict(), steps: z.array(z.object({ id: z.string().uuid(), type: z.string().min(1).max(80), state: z.enum(["completed", "current", "upcoming"]), requiresApproval: z.boolean(), waitsForUser: z.boolean(), optional: z.boolean() }).strict()).min(1), actions: z.tuple([z.literal("continue")]) }).strict();
const idea = z.object({ type: z.literal("idea"), ideaId: z.string().uuid(), title: z.string().trim().min(1).max(300), message: z.string().trim().min(1).max(1500), actions: z.tuple([z.literal("accept"), z.literal("dismiss")]) }).strict();
const approval = z.object({ type: z.literal("approval"), actionId: z.string().uuid(), actionType: z.string().trim().min(1).max(80), summary: z.string().trim().min(1).max(500), actions: z.tuple([z.literal("approve"), z.literal("reject")]) }).strict();
const reminder = z.object({ type: z.literal("reminder"), eventId: z.string().uuid(), title: z.string().trim().min(1).max(300), date: z.string().date() }).strict();
const insight = z.object({ type: z.literal("person_insight"), personId: z.string().uuid(), title: z.string().trim().min(1).max(300), reasons: z.array(reason).min(1).max(3) }).strict();
export const happyUIBlockSchema = z.discriminatedUnion("type", [gift, task, idea, approval, reminder, insight]);
export type HappyUIBlock = z.infer<typeof happyUIBlockSchema>;
export type HappyResolvedReason = z.infer<typeof reason>;
export function taskProgressBlockFromCard(card: HappyTaskCardModel): Extract<HappyUIBlock, { type: "task_progress" }> { return { type: "task_progress", taskId: card.id, title: card.title, event: { date: card.event.date, daysUntil: card.event.daysUntil }, progress: { ...card.progress }, steps: card.steps.map((step) => ({ ...step })), actions: ["continue"] }; }

export function resolveHappyReasonSources(context: HappyAgentIntentContext, refs: HappyReasonSourceRef[]): HappyResolvedReason[] | null {
  const seen = new Set<string>(); const out: HappyResolvedReason[] = [];
  for (const ref of refs) { const key = `${ref.type}:${ref.id}`; if (seen.has(key)) return null; seen.add(key);
    if (ref.type === "knowledge") { const sections: Array<["preference" | "fact", Array<{ id: string; text: string }> | undefined]> = [["preference", context.knowledge?.likes], ["preference", context.knowledge?.dislikes], ["preference", context.knowledge?.interests], ["fact", context.knowledge?.importantFacts]]; const found = sections.flatMap(([sourceType, items]) => (items ?? []).filter((item) => item.id === ref.id).map((item) => ({ source: ref, sourceType, label: item.text })))[0]; if (!found) return null; out.push(found); }
    else if (ref.type === "memory") { const item = context.memories?.find((value) => value.id === ref.id); if (!item) return null; out.push({ source: ref, sourceType: "memory", label: item.text }); }
    else { const item = context.gifts?.previous?.find((value) => value.id === ref.id); if (!item) return null; out.push({ source: ref, sourceType: "gift_history", label: item.title }); }
  } return out;
}

export function buildGiftRecommendationBlock({ idea, intentContext }: { idea: { title: string; message: string; reasonSources: HappyReasonSourceRef[] }; intentContext: HappyAgentIntentContext }): Extract<HappyUIBlock, { type: "gift_recommendation" }> | null { const reasons = resolveHappyReasonSources(intentContext, idea.reasonSources); return reasons ? { type: "gift_recommendation", gift: { title: idea.title, description: idea.message }, reasons, actions: ["save", "dismiss", "more_like_this"] } : null; }
