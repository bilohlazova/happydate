import {
  consumerContent,
  consumerIsActive,
  consumerValue,
  type KnowledgeItem,
} from "../knowledge/index.ts";

export type GiftKnowledgeSection =
  | "likes"
  | "dislikes"
  | "preferences"
  | "hobbies"
  | "wishes"
  | "sizes"
  | "importantFacts"
  | "giftIdeas"
  | "giftHistory"
  | "experiences"
  | "notes";

export interface GiftKnowledgeFact {
  knowledgeId: string;
  section: GiftKnowledgeSection;
  value: string;
  occurredOn: string | null;
  eventId: string | null;
}

export interface GiftKnowledgeContext {
  personId: string;
  facts: GiftKnowledgeFact[];
}

function text(item: KnowledgeItem): string | null {
  const value = consumerValue(item) ?? consumerContent(item) ?? item.title;
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized || null;
}

function section(item: KnowledgeItem): GiftKnowledgeSection | null {
  if (item.kind === "gift") {
    return item.category === "history" ? "giftHistory" : "giftIdeas";
  }
  if (item.kind === "wish") return "wishes";
  if (item.kind === "experience") return "experiences";
  if (item.kind === "fact") return "importantFacts";
  if (item.kind === "note") return "notes";
  if (item.kind !== "preference") return null;
  if (item.polarity === "dislikes" || item.polarity === "avoids") {
    return "dislikes";
  }
  if (["size", "clothing_size", "shoe_size", "ring_size"].includes(item.category ?? "")) {
    return "sizes";
  }
  if (item.category === "hobby") return "hobbies";
  if (item.polarity === "likes" || item.polarity === "prefers") return "likes";
  return "preferences";
}

export function buildGiftKnowledgeContext(
  personId: string,
  items: readonly KnowledgeItem[],
): GiftKnowledgeContext {
  const facts: GiftKnowledgeFact[] = [];
  for (const item of items) {
    if (
      item.personId !== personId ||
      !consumerIsActive(item) ||
      !item.aiEligible ||
      item.kind === "journal"
    ) continue;
    const value = text(item);
    const targetSection = section(item);
    if (!value || !targetSection) continue;
    facts.push({
      knowledgeId: item.id,
      section: targetSection,
      value,
      occurredOn: item.occurredOn,
      eventId: item.eventId,
    });
  }
  return { personId, facts };
}

/** Keep the existing prompt shape while replacing its data source. */
export function formatGiftContextAsLegacyNotes(
  context: GiftKnowledgeContext,
  legacyFallback: readonly string[] = [],
): string {
  const values = context.facts.length
    ? context.facts.map((fact) => fact.value)
    : legacyFallback.map((value) => value.trim()).filter(Boolean);
  return values.length
    ? values.map((value) => `- ${value}`).join("\n")
    : "No notes provided.";
}

