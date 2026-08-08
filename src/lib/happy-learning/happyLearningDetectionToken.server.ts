import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { HappyLearningDetectionCandidate } from "./happyLearningDetectV2.types.ts";

export const HAPPY_LEARNING_TOKEN_TTL_SECONDS = 10 * 60;

export type HappyLearningConfirmationCandidate = Pick<
  HappyLearningDetectionCandidate,
  "id" | "personId" | "captureType" | "value" | "polarity" | "semanticTags" | "evidenceText" | "source" | "schemaVersion"
>;

type DetectionTokenClaims = {
  v: 1;
  userId: string;
  personId: string;
  candidateHash: string;
  captureType: string;
  value: string;
  polarity: string | null;
  semanticTags: string[];
  evidenceHash: string;
  source: HappyLearningConfirmationCandidate["source"];
  schemaVersion: string;
  iat: number;
  exp: number;
  jti: string;
};

function digest(value: string): string {
  return createHash("sha256").update(value).digest("base64url");
}

function canonicalCandidate(candidate: HappyLearningConfirmationCandidate): string {
  return JSON.stringify({
    id: candidate.id,
    personId: candidate.personId,
    captureType: candidate.captureType,
    value: candidate.value,
    polarity: candidate.polarity,
    semanticTags: candidate.semanticTags,
    evidenceText: candidate.evidenceText,
    source: candidate.source,
    schemaVersion: candidate.schemaVersion,
  });
}

function signature(encodedPayload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(encodedPayload).digest();
}

export function issueHappyLearningDetectionToken(input: {
  userId: string;
  candidate: HappyLearningConfirmationCandidate;
  secret: string;
  now?: number;
}): string {
  if (!input.secret) throw new Error("happy_learning_token_secret_missing");
  const iat = Math.floor((input.now ?? Date.now()) / 1_000);
  const candidateHash = digest(canonicalCandidate(input.candidate));
  const claims: DetectionTokenClaims = {
    v: 1,
    userId: input.userId,
    personId: input.candidate.personId,
    candidateHash,
    captureType: input.candidate.captureType,
    value: input.candidate.value,
    polarity: input.candidate.polarity,
    semanticTags: [...input.candidate.semanticTags],
    evidenceHash: digest(input.candidate.evidenceText),
    source: input.candidate.source,
    schemaVersion: input.candidate.schemaVersion,
    iat,
    exp: iat + HAPPY_LEARNING_TOKEN_TTL_SECONDS,
    jti: digest(`${input.userId}\u0000${candidateHash}\u0000${iat}`),
  };
  const encoded = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${encoded}.${signature(encoded, input.secret).toString("base64url")}`;
}

export type DetectionTokenVerification =
  | { ok: true; claims: DetectionTokenClaims }
  | { ok: false; error: "invalid_token" | "expired_token" | "stale_candidate" };

export function verifyHappyLearningDetectionToken(input: {
  token: string;
  candidate: HappyLearningConfirmationCandidate;
  secret: string;
  now?: number;
}): DetectionTokenVerification {
  if (!input.secret || input.token.length > 4_096) return { ok: false, error: "invalid_token" };
  const [encoded, encodedSignature, extra] = input.token.split(".");
  if (!encoded || !encodedSignature || extra) return { ok: false, error: "invalid_token" };
  let supplied: Buffer;
  let claims: DetectionTokenClaims;
  try {
    supplied = Buffer.from(encodedSignature, "base64url");
    claims = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as DetectionTokenClaims;
  } catch {
    return { ok: false, error: "invalid_token" };
  }
  const expected = signature(encoded, input.secret);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return { ok: false, error: "invalid_token" };
  if (!claims || claims.v !== 1 || (claims.source !== "chat_message" && claims.source !== "gift_discovery")) return { ok: false, error: "invalid_token" };
  const now = Math.floor((input.now ?? Date.now()) / 1_000);
  if (!Number.isInteger(claims.iat) || !Number.isInteger(claims.exp) || claims.exp <= now || claims.iat > now + 60) {
    return { ok: false, error: "expired_token" };
  }
  const candidateHash = digest(canonicalCandidate(input.candidate));
  if (
    claims.candidateHash !== candidateHash
    || claims.personId !== input.candidate.personId
    || claims.captureType !== input.candidate.captureType
    || claims.value !== input.candidate.value
    || claims.polarity !== input.candidate.polarity
    || JSON.stringify(claims.semanticTags) !== JSON.stringify(input.candidate.semanticTags)
    || claims.evidenceHash !== digest(input.candidate.evidenceText)
    || claims.source !== input.candidate.source
    || claims.schemaVersion !== input.candidate.schemaVersion
  ) return { ok: false, error: "stale_candidate" };
  return { ok: true, claims };
}
