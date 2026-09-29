import { getHappyTaskTemplate, type BirthdayPreparationStepType } from "../task-engine/happyTaskTemplate.ts";

export type HappyTaskCardSource = { id: string; userId: string; type: string; status: string; personId: string | null; eventId: string | null; contextSnapshot: unknown; personName: string | null; eventDate: string | null; steps: Array<{ id: string; position: number; type: string; status: string; requiresApproval: boolean }> };
export type HappyTaskCardModel = { id: string; type: "birthday_preparation"; title: string; person: { id: string; name: string }; event: { id: string; date: string; daysUntil: number }; status: "active" | "waiting_user" | "paused"; progress: { completed: number; total: number }; steps: Array<{ id: string; type: BirthdayPreparationStepType; state: "completed" | "current" | "upcoming"; requiresApproval: boolean; waitsForUser: boolean; optional: boolean }> };

function daysUntil(date: string, now: Date): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [year, month, day] = date.split("-").map(Number);
  const event = Date.UTC(year, month - 1, day);
  const current = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((event - current) / 86_400_000);
}

export function buildHappyTaskCardModel(source: HappyTaskCardSource, now = new Date()): HappyTaskCardModel | null {
  const template = getHappyTaskTemplate(source.type);
  const version = source.contextSnapshot && typeof source.contextSnapshot === "object" ? (source.contextSnapshot as { templateVersion?: unknown }).templateVersion : null;
  const days = source.eventDate ? daysUntil(source.eventDate, now) : null;
  if (!template || version !== 1 || !source.personId || !source.personName || !source.eventId || !source.eventDate || days === null || !["active", "waiting_user", "paused"].includes(source.status) || source.steps.length !== template.steps.length) return null;
  const durable = source.steps.slice().sort((a, b) => a.position - b.position);
  if (durable.some((step, index) => step.position !== template.steps[index]?.position || step.type !== template.steps[index]?.type || step.requiresApproval !== template.steps[index]?.requiresApproval)) return null;
  let currentFound = false;
  const steps = durable.map((step, index) => {
    const canonical = template.steps[index];
    const completed = step.status === "completed";
    const state: "completed" | "current" | "upcoming" = completed ? "completed" : currentFound ? "upcoming" : (currentFound = true, "current");
    return { id: step.id, type: canonical.type, state, requiresApproval: canonical.requiresApproval, waitsForUser: canonical.waitsForUser, optional: canonical.optional };
  });
  return { id: source.id, type: "birthday_preparation", title: source.personName, person: { id: source.personId, name: source.personName }, event: { id: source.eventId, date: source.eventDate, daysUntil: days }, status: source.status as HappyTaskCardModel["status"], progress: { completed: steps.filter((step) => step.state === "completed").length, total: template.steps.length }, steps };
}

export function selectPrimaryHappyTask(tasks: HappyTaskCardSource[], now = new Date()): HappyTaskCardModel | null {
  const rank: Record<string, number> = { waiting_user: 0, active: 1, paused: 2 };
  return tasks.map((task) => buildHappyTaskCardModel(task, now)).filter((task): task is HappyTaskCardModel => Boolean(task)).sort((a, b) => rank[a.status] - rank[b.status] || a.event.daysUntil - b.event.daysUntil || a.id.localeCompare(b.id))[0] ?? null;
}
