import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ideas = await import("../src/lib/happy/ideas/index.ts");
const engineSource = await readFile(new URL("../src/lib/happy/ideas/evaluateHappyIdeas.ts", import.meta.url), "utf8");
const birthdaySource = await readFile(new URL("../src/lib/happy/ideas/birthdayIdeas.ts", import.meta.url), "utf8");
const memorySource = await readFile(new URL("../src/lib/happy/ideas/memoryIdeas.ts", import.meta.url), "utf8");
const relationshipSource = await readFile(new URL("../src/lib/happy/ideas/relationshipIdeas.ts", import.meta.url), "utf8");

const now = new Date("2026-09-28T10:00:00.000Z");
const candidate = (overrides = {}) => ({
  userId: "user-a",
  eventId: "event-a",
  personId: "person-a",
  personOwnerId: "user-a",
  occurrenceDate: "2026-10-18",
  hasActiveTask: false,
  hasPreparedGift: false,
  hasGreetingPrepared: false,
  existingIdeaStatuses: {},
  ...overrides,
});
const context = (overrides = {}) => ({ userId: "user-a", now, birthdayCandidates: [candidate()], ...overrides });

test("birthday evaluator produces the existing canonical start, help, and greeting candidates", () => {
  assert.deepEqual(ideas.evaluateHappyIdeas(context({ birthdayCandidates: [candidate({ occurrenceDate: "2026-10-18" })] })).map((idea) => idea.kind), ["start_gift_planning"]);
  assert.deepEqual(ideas.evaluateHappyIdeas(context({ birthdayCandidates: [candidate({ occurrenceDate: "2026-10-08" })] })).map((idea) => idea.kind), ["gift_help"]);
  assert.deepEqual(ideas.evaluateHappyIdeas(context({ birthdayCandidates: [candidate({ occurrenceDate: "2026-09-29", hasPreparedGift: true })] })).map((idea) => idea.kind), ["prepare_greeting"]);
});

test("existing birthday state suppresses applicable candidates", () => {
  assert.deepEqual(ideas.evaluateHappyIdeas(context({ birthdayCandidates: [candidate({ occurrenceDate: "2026-10-08", hasPreparedGift: true })] })), []);
  assert.deepEqual(ideas.evaluateHappyIdeas(context({ birthdayCandidates: [candidate({ occurrenceDate: "2026-10-08", hasActiveTask: true })] })), []);
  assert.deepEqual(ideas.evaluateHappyIdeas(context({ birthdayCandidates: [candidate({ occurrenceDate: "2026-09-29", hasPreparedGift: true, hasGreetingPrepared: true })] })), []);
});

test("semantic keys are stable, occurrence-specific, and independent per rule", () => {
  const base = candidate({ occurrenceDate: "2026-10-08" });
  const [first] = ideas.evaluateHappyIdeas(context({ birthdayCandidates: [base] }));
  const [same] = ideas.evaluateHappyIdeas(context({ birthdayCandidates: [base] }));
  assert.equal(first.semanticKey, same.semanticKey);
  assert.notEqual(first.semanticKey, ideas.evaluateHappyIdeas(context({ birthdayCandidates: [candidate({ occurrenceDate: "2027-10-08" })] }))[0]?.semanticKey);
  assert.notEqual(first.semanticKey, "birthday:prepare_greeting:event-a:2026-10-08");
});

test("orchestrator order is deterministic and collapses duplicate semantic keys in one pass", () => {
  const inputs = [candidate({ eventId: "event-b", occurrenceDate: "2026-10-08" }), candidate({ eventId: "event-a", occurrenceDate: "2026-10-08" }), candidate({ eventId: "event-a", occurrenceDate: "2026-10-08" })];
  const first = ideas.evaluateHappyIdeas(context({ birthdayCandidates: inputs }));
  const second = ideas.evaluateHappyIdeas(context({ birthdayCandidates: inputs }));
  assert.deepEqual(first, second);
  assert.deepEqual(first.map((idea) => idea.eventId), ["event-b", "event-a"]);
});

test("bounded context filters foreign users and unrelated events without any database or AI boundary", () => {
  const output = ideas.evaluateHappyIdeas(context({
    eventId: "event-a",
    birthdayCandidates: [candidate(), candidate({ userId: "user-b", personOwnerId: "user-b", eventId: "event-b" }), candidate({ eventId: "event-c" })],
  }));
  assert.deepEqual(output.map((idea) => idea.eventId), ["event-a"]);
  const source = `${engineSource}\n${birthdaySource}\n${memorySource}\n${relationshipSource}`;
  assert.doesNotMatch(source, /@supabase|SupabaseClient|createClient|\.from\(|\.rpc\(|\.insert\(|\.update\(|\.delete\(/i);
  assert.doesNotMatch(source, /openai|happyAgentProvider|\/api\/happy\/agent|ai-chat|structured.?output|chat\.completions|responses\.create/i);
});

test("memory and relationship evaluators are explicit no-op V1 extension points", () => {
  assert.deepEqual(ideas.evaluateMemoryIdeas(context()), []);
  assert.deepEqual(ideas.evaluateRelationshipIdeas(context()), []);
});

test("birthday adapter reuses the proactive rule source instead of duplicating timing", () => {
  assert.match(birthdaySource, /decideBirthdayProactive/);
  assert.match(birthdaySource, /proactiveIdeaKey/);
});
