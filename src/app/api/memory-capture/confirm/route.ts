import { NextResponse } from "next/server";
import {
  authenticateGiftRequest,
  resolveGiftAccess,
} from "@/lib/gifts/giftApiSecurity";
import {
  findOwnedGiftPerson,
  loadGiftIntelligenceSource,
} from "@/lib/repositories/giftIntelligenceRepository.server";
import {
  createKnowledgeOnServer,
} from "@/lib/repositories/knowledgeRepository";
import {
  mapMemoryCaptureCandidateToKnowledgeInput,
  normalizeMemoryCaptureCandidateValue,
  normalizeMemoryCaptureValue,
  type MemoryCaptureCandidate,
  type MemoryCaptureCandidateSource,
  type MemoryCaptureCandidateType,
} from "@/lib/memory-capture";

type MemoryCaptureConfirmBody = {
  personId?: unknown;
  candidate?: unknown;
};

const ALLOWED_CANDIDATE_KEYS = new Set([
  "id",
  "type",
  "value",
  "confidence",
  "source",
  "requiresConfirmation",
]);
const SUPPORTED_TYPES = new Set<MemoryCaptureCandidateType>([
  "interest",
  "hobby",
  "favorite_brand",
  "disliked_gift",
  "preferred_style",
]);
const SUPPORTED_SOURCES = new Set<MemoryCaptureCandidateSource>([
  "discovery_answer",
  "ai_response",
]);

function safeError(status: 400 | 401 | 404 | 500, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

function parseCandidate(value: unknown): MemoryCaptureCandidate | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (Object.keys(raw).some((key) => !ALLOWED_CANDIDATE_KEYS.has(key))) return null;
  if (typeof raw.id !== "string" || !raw.id.trim()) return null;
  if (typeof raw.type !== "string" || !SUPPORTED_TYPES.has(raw.type as MemoryCaptureCandidateType)) {
    return null;
  }
  const candidateValue = normalizeMemoryCaptureCandidateValue(raw.value);
  if (!candidateValue) return null;
  if (raw.confidence !== "high") return null;
  if (typeof raw.source !== "string" || !SUPPORTED_SOURCES.has(raw.source as MemoryCaptureCandidateSource)) {
    return null;
  }
  if (raw.requiresConfirmation !== true) return null;

  return {
    id: raw.id.trim(),
    type: raw.type as MemoryCaptureCandidateType,
    value: candidateValue,
    confidence: "high",
    source: raw.source as MemoryCaptureCandidateSource,
    requiresConfirmation: true,
  };
}

function existingKnowledgeValues(source: Awaited<ReturnType<typeof loadGiftIntelligenceSource>>) {
  return source.knowledge
    .map((item) => item.value ?? item.compatibility.valueText ?? item.compatibility.contentText ?? item.title)
    .filter((item): item is string => Boolean(item?.trim()));
}

function alreadyExists(
  source: Awaited<ReturnType<typeof loadGiftIntelligenceSource>>,
  candidate: MemoryCaptureCandidate,
): boolean {
  const normalizedCandidate = normalizeMemoryCaptureValue(candidate.value);
  return existingKnowledgeValues(source).some(
    (value) => normalizeMemoryCaptureValue(value) === normalizedCandidate,
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as MemoryCaptureConfirmBody;
    const personId = typeof body.personId === "string" ? body.personId.trim() : "";
    const candidate = parseCandidate(body.candidate);

    if (!personId || !candidate) {
      return safeError(400, "invalid_candidate");
    }

    const access = await resolveGiftAccess(req, personId, {
      authenticate: authenticateGiftRequest,
      findOwnedPerson: findOwnedGiftPerson,
    });
    if (!access.ok) {
      return safeError(access.status, access.error);
    }

    const source = await loadGiftIntelligenceSource(access.person);
    if (alreadyExists(source, candidate)) {
      return NextResponse.json({
        ok: true,
        status: "already_exists",
        knowledgeId: null,
      });
    }

    const mapped = mapMemoryCaptureCandidateToKnowledgeInput({
      userId: access.person.userId,
      personId: access.person.id,
      candidate,
    });
    if (!mapped.ok) {
      return safeError(400, mapped.error);
    }

    const knowledge = await createKnowledgeOnServer(mapped.input);
    return NextResponse.json({
      ok: true,
      status: "created",
      knowledgeId: knowledge.id,
    });
  } catch {
    return safeError(500, "save_failed");
  }
}
