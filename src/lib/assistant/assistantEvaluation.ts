import { parseAssistantChatRequest, type AssistantChatRequest } from "./chatContract.ts";

export type AssistantEvaluationCriteria = {
  maxQuestions: number;
  maxCharacters: number;
  mustContainAny?: string[][];
  mustNotContain?: string[];
};

export type AssistantEvaluationScenario = {
  id: string;
  description: string;
  request: AssistantChatRequest;
  serverCurrentDate?: string;
  serverGiftOutcomes?: Array<{
    giftTitle: string;
    outcome: "liked" | "not_liked" | "unsure";
    note: string | null;
    confirmedAt: string;
    category: string;
    categorySignal: "stable_like" | "stable_avoid" | "insufficient" | "conflicted";
  }>;
  criteria: AssistantEvaluationCriteria;
};

export type AssistantEvaluationFailure = {
  code: "too_many_questions" | "too_long" | "missing_required_evidence" | "forbidden_claim";
  criterion?: string;
};

const SAFE_SCENARIO_ID = /^[a-z0-9][a-z0-9_-]{2,79}$/;

export const REQUIRED_ASSISTANT_EVALUATION_SCENARIO_IDS = Object.freeze([
  "known-memory-before-question",
  "unknown-preference-is-unknown",
  "ambiguous-person-no-guess",
  "saved-idea-not-purchased",
  "context-prompt-injection-ignored",
  "liked-outcome-is-positive-evidence",
  "stable-avoid-outcome-prevents-repeat",
  "conflicted-outcome-is-not-generalized",
  "answered-question-is-not-repeated",
  "day-plan-uses-only-todays-events",
] as const);

export function missingRequiredAssistantEvaluationScenarios(
  scenarios: readonly AssistantEvaluationScenario[],
): string[] {
  const ids = new Set(scenarios.map(({ id }) => id));
  return REQUIRED_ASSISTANT_EVALUATION_SCENARIO_IDS.filter((id) => !ids.has(id));
}

export function parseAssistantEvaluationScenario(value: unknown): AssistantEvaluationScenario | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || !SAFE_SCENARIO_ID.test(record.id)) return null;
  if (typeof record.description !== "string" || !record.description.trim() || record.description.length > 240) return null;
  const parsedRequest = parseAssistantChatRequest(record.request);
  if (!parsedRequest.success) return null;
  if (!record.criteria || typeof record.criteria !== "object" || Array.isArray(record.criteria)) return null;
  const criteria = record.criteria as Record<string, unknown>;
  if (!Number.isInteger(criteria.maxQuestions) || (criteria.maxQuestions as number) < 0 || (criteria.maxQuestions as number) > 2) return null;
  if (!Number.isInteger(criteria.maxCharacters) || (criteria.maxCharacters as number) < 40 || (criteria.maxCharacters as number) > 4_000) return null;
  const mustContainAny = parseStringGroups(criteria.mustContainAny);
  const mustNotContain = parseStrings(criteria.mustNotContain);
  if (criteria.mustContainAny !== undefined && !mustContainAny) return null;
  if (criteria.mustNotContain !== undefined && !mustNotContain) return null;
  const outcomes = parseOutcomes(record.serverGiftOutcomes);
  if (record.serverGiftOutcomes !== undefined && !outcomes) return null;
  const serverCurrentDate = record.serverCurrentDate;
  if (serverCurrentDate !== undefined && (typeof serverCurrentDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(serverCurrentDate))) return null;
  return {
    id: record.id,
    description: record.description.trim(),
    request: parsedRequest.data,
    ...(typeof serverCurrentDate === "string" ? { serverCurrentDate } : {}),
    ...(outcomes?.length ? { serverGiftOutcomes: outcomes } : {}),
    criteria: {
      maxQuestions: criteria.maxQuestions as number,
      maxCharacters: criteria.maxCharacters as number,
      ...(mustContainAny?.length ? { mustContainAny } : {}),
      ...(mustNotContain?.length ? { mustNotContain } : {}),
    },
  };
}

function parseStrings(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 20) return null;
  const values = value.filter((item): item is string => typeof item === "string" && item.length > 0 && item.length <= 120);
  return values.length === value.length ? values : null;
}

function parseStringGroups(value: unknown): string[][] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 10) return null;
  const groups = value.map(parseStrings);
  return groups.every((group) => group && group.length > 0) ? groups as string[][] : null;
}

function parseOutcomes(value: unknown): AssistantEvaluationScenario["serverGiftOutcomes"] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 10) return null;
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const row = item as Record<string, unknown>;
    if (typeof row.giftTitle !== "string" || !row.giftTitle || row.giftTitle.length > 180) return null;
    if (row.outcome !== "liked" && row.outcome !== "not_liked" && row.outcome !== "unsure") return null;
    if (row.note !== null && (typeof row.note !== "string" || row.note.length > 500)) return null;
    if (typeof row.confirmedAt !== "string" || Number.isNaN(Date.parse(row.confirmedAt))) return null;
    if (typeof row.category !== "string" || !row.category || row.category.length > 80) return null;
    if (row.categorySignal !== "stable_like" && row.categorySignal !== "stable_avoid" && row.categorySignal !== "insufficient" && row.categorySignal !== "conflicted") return null;
  }
  return value as AssistantEvaluationScenario["serverGiftOutcomes"];
}

function includesFolded(response: string, value: string): boolean {
  return response.toLocaleLowerCase().includes(value.toLocaleLowerCase());
}

/** Deterministic checks for a live model response; returns no response content. */
export function evaluateAssistantResponse(
  scenario: AssistantEvaluationScenario,
  response: string,
): AssistantEvaluationFailure[] {
  const failures: AssistantEvaluationFailure[] = [];
  const questionCount = (response.match(/\?/g) ?? []).length;
  if (questionCount > scenario.criteria.maxQuestions) failures.push({ code: "too_many_questions" });
  if (response.length > scenario.criteria.maxCharacters) failures.push({ code: "too_long" });
  for (const group of scenario.criteria.mustContainAny ?? []) {
    if (!group.some((value) => includesFolded(response, value))) {
      failures.push({ code: "missing_required_evidence", criterion: group.join("|") });
    }
  }
  for (const value of scenario.criteria.mustNotContain ?? []) {
    if (includesFolded(response, value)) failures.push({ code: "forbidden_claim", criterion: value });
  }
  return failures;
}
