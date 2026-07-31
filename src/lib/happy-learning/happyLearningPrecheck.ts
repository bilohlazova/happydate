import type { HappyLearningExtractorInput } from "./happyLearning.types.ts";
import { HAPPY_LEARNING_LIMITS } from "./happyLearningSchema.ts";

const ACKNOWLEDGEMENTS = new Set([
  "так", "ні", "ок", "добре", "дякую", "yes", "no", "okay", "thanks",
  "tak", "nie", "dziękuję", "да", "нет", "спасибо", "ja", "nein", "danke",
]);
const UNCERTAINTY = /(?:^|[^\p{Letter}])(можливо|мабуть|напевно|здається|может быть|наверное|кажется|może|chyba|prawdopodobnie|maybe|perhaps|probably|might|vielleicht|wahrscheinlich|vermutlich)(?=$|[^\p{Letter}])/iu;
const FIRST_PERSON_START = /^(я|мені|мене|мне|меня|ja|mi|mnie|i|me|my|ich|mir|mich)(?=$|[^\p{Letter}])/iu;
const QUESTION_START = /^(чи|хіба|czy|does|do|is|are|did|can|could|would|who|what|when|where|why|how|ли|разве|ist|sind|hat|haben|mag|möchte|wer|was|wann|wo|warum|wie)(?=$|[^\p{Letter}])/iu;
const BUDGET_ONLY = /^(budget|budżet|бюджет)?\s*\d+([\s,.]\d+)?\s*(zł|zl|pln|грн|uah|€|eur|\$|usd)?$/iu;
const LOGISTICS_ONLY = /^(сьогодні|завтра|терміново|потрібно завтра|доставка|дедлайн|dzisiaj|jutro|pilne|potrzebuję jutro|dostawa|today|tomorrow|needed tomorrow|urgent|delivery|сегодня|завтра|нужно завтра|срочно|доставка|heute|morgen|wird morgen benötigt|dringend|lieferung)(\s+.*)?$/iu;
const PROMPT_INJECTION_ONLY = /^(ignore|ігноруй|ігнорувати|zignoruj|игнорируй|ignoriere)(?=$|[^\p{Letter}]).*(instruction|instructions|інструкц|instrukcj|инструкц|anweisung)/iu;
const SENSITIVE = /(?:^|[^\p{Letter}])(password|passcode|пароль|hasło|passwort|pin|cvv|iban|swift|bank account|номер карт|karta płatnicza|konto bankowe|bankkonto|адреса проживання|точна адреса|live location|pesel|passport|паспорт|ausweis|diagnos\p{Letter}*|діагноз\p{Letter}*|диагноз\p{Letter}*|sexual orientation|сексуальн\p{Letter}*|орієнтац\p{Letter}*|ориентац\p{Letter}*|religion|релігі\p{Letter}*|религи\p{Letter}*|політичн\p{Letter}*|политическ\p{Letter}*|biometric|біометр\p{Letter}*|criminal|кримінал\p{Letter}*|судиміст\p{Letter}*)(?=$|[^\p{Letter}])/iu;

function normalize(value: string): string {
  return value.replace(/[^\p{Letter}\p{Number}\s]+/gu, " ").replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

export type HappyLearningPrecheckResult =
  | { eligible: true }
  | { eligible: false; reason: "missing_person" | "empty" | "oversized" | "acknowledgement" | "name_only" | "budget" | "logistics" | "question" | "uncertain" | "first_person" | "sensitive" | "prompt_injection" };

export function precheckHappyLearning(input: HappyLearningExtractorInput): HappyLearningPrecheckResult {
  if (!input.resolvedPerson.id.trim() || !input.resolvedPerson.name.trim()) return { eligible: false, reason: "missing_person" };
  const message = input.userMessage.trim();
  if (!message) return { eligible: false, reason: "empty" };
  if (message.length > HAPPY_LEARNING_LIMITS.maxMessageLength) return { eligible: false, reason: "oversized" };
  const normalized = normalize(message);
  if (ACKNOWLEDGEMENTS.has(normalized)) return { eligible: false, reason: "acknowledgement" };
  if (normalized === normalize(input.resolvedPerson.name)) return { eligible: false, reason: "name_only" };
  if (BUDGET_ONLY.test(message)) return { eligible: false, reason: "budget" };
  if (LOGISTICS_ONLY.test(message)) return { eligible: false, reason: "logistics" };
  if (message.includes("?") || QUESTION_START.test(message)) return { eligible: false, reason: "question" };
  if (UNCERTAINTY.test(message)) return { eligible: false, reason: "uncertain" };
  if (FIRST_PERSON_START.test(message)) return { eligible: false, reason: "first_person" };
  if (SENSITIVE.test(message)) return { eligible: false, reason: "sensitive" };
  if (PROMPT_INJECTION_ONLY.test(message)) return { eligible: false, reason: "prompt_injection" };
  return { eligible: true };
}
