import type { HappyReasonSourceRef } from "../ui/happyUIBlock.ts";
import { daysUntil as calendarDaysUntil } from "../agent-context/happyAgentContext.selectors.ts";
import type { HomeRepositoryData, HomeTranslate } from "../../home/home.types.ts";
import type { HomePrimaryHappyBlock } from "./primaryHappyBlock.types.ts";
import { hasMatchingBirthdayGift, resolveBirthdayUrgency, type BirthdayUrgency } from "../../birthday/birthdayPresentation.ts";
import { birthYearFromFullBirthday, resolveBirthdayTurningAge } from "../../birthday/birthdayAge.ts";
import type { OccasionPersonCandidate } from "../../occasions/occasionPeople.types.ts";

export type HomePrimaryHappyPresentation = {
  kind: HomePrimaryHappyBlock["type"];
  eyebrow: string;
  title: string;
  timing: string | null;
  turningAgeLabel: string | null;
  statusText: string;
  context: { text: string; source: HappyReasonSourceRef } | null;
  primaryAction: { kind: "accept_idea" | "continue_task" | "approve_action" | "show_rescue"; label: string } | null;
  secondaryAction: { kind: "dismiss_idea" | "reject_action"; label: string } | null;
  errorText: string;
  urgency: BirthdayUrgency;
  visualTreatment?: "standard" | "compact" | "high_attention" | "selection";
  occasionCandidates?: readonly OccasionPersonCandidate[];
};

function countdown(days: number | null, t: HomeTranslate): string | null {
  if (days === null || days < 0) return null;
  if (days === 0) return t("countdown.today");
  if (days === 1) return t("countdown.tomorrow");
  return t("countdown.days", { count: days });
}

function sourceContext(data: HomeRepositoryData, personId: string | null, eventId: string | null, t: HomeTranslate): HomePrimaryHappyPresentation["context"] {
  if (!personId) return null;
  const preference = data.memories
    .filter((item) => item.isActive && item.category === "preference" && item.userConfirmed === true && item.personId === personId && typeof item.value === "string" && item.value.trim())
    .sort((a, b) => (a.eventId === eventId ? -1 : 1) - (b.eventId === eventId ? -1 : 1) || (a.createdAt ?? "").localeCompare(b.createdAt ?? "") || a.id.localeCompare(b.id))[0];
  return preference ? {
    text: t("primaryHappy.context.preference", { value: preference.value!.trim() }),
    source: { type: "knowledge", id: preference.id },
  } : null;
}

function semanticIdeaCopy(type: string, t: HomeTranslate): Pick<HomePrimaryHappyPresentation, "statusText" | "primaryAction"> {
  if (type === "start_gift_planning") return { statusText: t("primaryHappy.status.giftUnresolved"), primaryAction: { kind: "accept_idea", label: t("primaryHappy.actions.startGiftPlanning") } };
  if (type === "gift_help") return { statusText: t("primaryHappy.status.giftUnresolved"), primaryAction: { kind: "accept_idea", label: t("primaryHappy.actions.giftHelp") } };
  if (type === "prepare_greeting") return { statusText: t("primaryHappy.status.prepareGreeting"), primaryAction: { kind: "accept_idea", label: t("primaryHappy.actions.prepareGreeting") } };
  return { statusText: t("primaryHappy.status.idea"), primaryAction: { kind: "accept_idea", label: t("primaryHappy.actions.reviewIdea") } };
}

/** Pure presentation adapter: no I/O, no AI, and no priority decisions. */
export function buildHomePrimaryHappyPresentation(block: HomePrimaryHappyBlock | null, data: HomeRepositoryData, now: Date, t: HomeTranslate): HomePrimaryHappyPresentation | null {
  if (!block) return null;
  if (block.type === "task_progress") return {
    kind: "task_progress",
    eyebrow: t("primaryHappy.eyebrow"),
    title: t("happyTask.title", { name: block.task.person.name }),
    timing: countdown(block.task.event.daysUntil, t),
    turningAgeLabel: null,
    statusText: block.task.status === "waiting_user"
      ? t("primaryHappy.status.taskWaiting")
      : t("happyTask.progress", { completed: block.task.progress.completed, total: block.task.progress.total }),
    context: sourceContext(data, block.task.person.id, block.task.event.id, t),
    primaryAction: { kind: "continue_task", label: t("primaryHappy.actions.continue") },
    secondaryAction: null,
    errorText: "",
    urgency: "normal",
  };
  if (block.type === "approval") return {
    kind: "approval",
    eyebrow: t("primaryHappy.eyebrow"),
    title: t("primaryHappy.approval.title"),
    timing: null,
    turningAgeLabel: null,
    statusText: block.action.summary || t(`primaryHappy.approval.actions.${block.action.type}`),
    context: null,
    // Only the V1 executor allowlist is executable. Other approval-required
    // tool types remain informative until their executor exists.
    primaryAction: block.action.type === "save_gift" || block.action.type === "save_memory"
      ? { kind: "approve_action", label: t("primaryHappy.idea.accept") }
      : null,
    secondaryAction: block.action.type === "save_gift" || block.action.type === "save_memory"
      ? { kind: "reject_action", label: t("primaryHappy.idea.dismiss") }
      : null,
    errorText: t("primaryHappy.idea.error"),
    urgency: "normal",
  };

  if (block.type === "occasion") {
    const signal = block.signal;
    const person = signal.personId ? data.people.find((item) => item.id === signal.personId) ?? null : null;
    const occasionName = t(`primaryHappy.occasion.${signal.occasionKey}`);
    const selection = signal.recipientResolution === "selection_required";
    const visualTreatment = selection
      ? "selection"
      : signal.phase === "planning" || signal.phase === "preparing"
        ? "compact"
        : "high_attention";
    const statusKey = selection ? "selectionRequired" : signal.readiness?.kind === "ready" ? "ready" : signal.phase;
    return {
      kind: "occasion",
      eyebrow: t("primaryHappy.eyebrow"),
      title: selection
        ? t("primaryHappy.occasion.selectionTitle", { occasion: occasionName })
        : t("primaryHappy.occasion.title", { occasion: occasionName, name: person?.name ?? occasionName }),
      timing: countdown(signal.daysUntil, t),
      turningAgeLabel: null,
      statusText: t(`primaryHappy.occasion.${statusKey}`),
      context: null,
      primaryAction: null,
      secondaryAction: null,
      errorText: t("primaryHappy.idea.error"),
      urgency: "normal",
      visualTreatment,
      occasionCandidates: signal.candidates,
    };
  }

  if (block.type === "rescue") {
    const person = data.people.find((item) => item.id === block.signal.personId) ?? null;
    const occasionName = t(`primaryHappy.occasion.${block.signal.occasionKey}`);
    return {
      kind: "rescue",
      eyebrow: t("primaryHappy.eyebrow"),
      title: t("primaryHappy.rescue.title", { occasion: occasionName, name: person?.name ?? occasionName }),
      timing: countdown(block.signal.daysUntil, t),
      turningAgeLabel: null,
      statusText: t("primaryHappy.rescue.status"),
      context: null,
      primaryAction: { kind: "show_rescue", label: t("primaryHappy.rescue.cta") },
      secondaryAction: null,
      errorText: t("primaryHappy.rescue.error"),
      urgency: "normal",
      visualTreatment: "high_attention",
    };
  }

  const event = block.idea.eventId ? data.events.find((item) => item.id === block.idea.eventId) ?? null : null;
  const person = block.idea.personId ? data.people.find((item) => item.id === block.idea.personId) ?? null : null;
  const title = event?.category?.toLowerCase() === "birthday" && person
    ? t("events.birthdayTitle", { name: person.name })
    : event?.title ?? t("primaryHappy.generalTitle");
  const remaining = event && /^\d{4}-\d{2}-\d{2}$/.test(event.date) ? calendarDaysUntil(event.date, now) : null;
  const copy = semanticIdeaCopy(block.idea.type, t);
  const eventContextId = event?.category?.toLowerCase() === "birthday" && event ? `${event.id}:${event.date}` : event?.id ?? null;
  const urgency = event?.category?.toLowerCase() === "birthday" && eventContextId
    ? resolveBirthdayUrgency({ occurrence: event.date, daysUntil: remaining, giftReady: hasMatchingBirthdayGift((data.giftHistory ?? []).map((gift) => ({ personId: gift.personId, eventId: gift.eventId, lifecycle: gift.lifecycle })), event.personId, eventContextId) })
    : "normal";
  const turningAge = event?.category?.toLowerCase() === "birthday" && person
    ? resolveBirthdayTurningAge({
      birthYear: birthYearFromFullBirthday(person.birthday) ?? person.birthYear ?? null,
      birthdayOccurrence: event.date,
    })
    : null;
  return {
    kind: "idea",
    eyebrow: t("primaryHappy.eyebrow"),
    title,
    timing: countdown(remaining, t),
    turningAgeLabel: turningAge === null ? null : t("events.turningAge", { age: turningAge }),
    statusText: copy.statusText,
    context: sourceContext(data, block.idea.personId, block.idea.eventId, t),
    primaryAction: copy.primaryAction,
    secondaryAction: { kind: "dismiss_idea", label: t("primaryHappy.idea.dismiss") },
    errorText: t("primaryHappy.idea.error"),
    urgency,
  };
}
