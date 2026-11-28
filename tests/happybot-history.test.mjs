// HD-CHAT-002 Phase 1C: pure rules of the unified history (segments, de-duplication, hydration merge)
// plus static guards that the reader is read-only and never feeds memory.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DUPLICATE_TURN_WINDOW_MS, dedupeTurns, historySegmentFor, mergeHydratedHistory, mergeLegacyTurns, turnBelongsToSegment, turnsToMessages } from "../src/lib/happybot/chatHistory.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OWNER = "user-A";
const at = (seconds) => new Date(Date.UTC(2026, 10, 28, 10, 0, seconds)).toISOString();
const turn = (id, overrides = {}) => ({ id, userId: OWNER, personId: null, scope: "global", userMessage: `q-${id}`, happyResponse: `a-${id}`, createdAt: at(Number(id.replace(/\D/g, "")) || 0), ...overrides });

test("only global and person conversations have a restorable segment; gift, event and task do not", () => {
  assert.deepEqual(historySegmentFor(undefined, null), { kind: "global" });
  assert.deepEqual(historySegmentFor({ type: "global" }, undefined), { kind: "global" });
  assert.deepEqual(historySegmentFor({ type: "person", personId: "p1" }, null), { kind: "person", personId: "p1" });
  assert.equal(historySegmentFor({ type: "global" }, { personId: "p1", eventId: "e1" }), null, "gift chat");
  assert.equal(historySegmentFor({ type: "person", personId: "p1" }, { personId: "p1", eventId: "e1" }), null, "gift chat on a profile");
  assert.equal(historySegmentFor({ type: "event", eventId: "e1" }, null), null);
  assert.equal(historySegmentFor({ type: "task", taskId: "t1" }, null), null);
});

test("segment membership is strict: owner, scope and person must all match", () => {
  const global = { kind: "global" };
  const person = { kind: "person", personId: "p1" };
  assert.ok(turnBelongsToSegment(turn("t1"), global, OWNER));
  assert.ok(!turnBelongsToSegment(turn("t1", { userId: "user-B" }), global, OWNER), "another owner");
  assert.ok(!turnBelongsToSegment(turn("t1", { personId: "p1" }), global, OWNER), "global scope with a person id is a gift/text-resolved chat");
  assert.ok(!turnBelongsToSegment(turn("t1", { scope: "event" }), global, OWNER));
  assert.ok(!turnBelongsToSegment(turn("t1", { scope: "task" }), global, OWNER));
  assert.ok(turnBelongsToSegment(turn("t2", { scope: "person", personId: "p1" }), person, OWNER));
  assert.ok(!turnBelongsToSegment(turn("t2", { scope: "person", personId: "p2" }), person, OWNER), "another person");
  assert.ok(!turnBelongsToSegment(turn("t2", { scope: "global", personId: "p1" }), person, OWNER), "gift chat is not the person chat");
  assert.ok(!turnBelongsToSegment(turn("t2", { scope: "person", personId: null }), person, OWNER));
});

test("dedupeTurns keeps the earliest copy of one exchange inside the window and every distinct or distant one", () => {
  const a = turn("t1", { userMessage: "Привіт", happyResponse: "Вітаю" });
  const copy = turn("t2", { userMessage: " Привіт ", happyResponse: "Вітаю", createdAt: at(5) });
  const later = turn("t3", { userMessage: "Привіт", happyResponse: "Вітаю", createdAt: new Date(Date.parse(a.createdAt) + DUPLICATE_TURN_WINDOW_MS + 1000).toISOString() });
  const other = turn("t4", { userMessage: "Інше", happyResponse: "Вітаю", createdAt: at(6) });
  assert.deepEqual(dedupeTurns([copy, other, a, later]).map((t) => t.id), ["t1", "t4", "t3"]);
});

test("mergeLegacyTurns drops legacy rows already in happy_chat_turns, keeps older ones, newest first", () => {
  const primary = [turn("t10", { scope: "person", personId: "p1", userMessage: "Нове", happyResponse: "Відповідь", createdAt: at(100) })];
  const legacyDuplicate = turn("l1", { scope: "person", personId: "p1", userMessage: "Нове", happyResponse: "Відповідь", createdAt: at(103) });
  const legacyOld = turn("l2", { scope: "person", personId: "p1", userMessage: "Давнє", happyResponse: "Колись", createdAt: at(1) });
  const merged = mergeLegacyTurns(primary, [legacyDuplicate, legacyOld]);
  assert.deepEqual(merged.map((t) => t.id), ["t10", "l2"]);
  assert.deepEqual(mergeLegacyTurns([], [legacyOld, legacyDuplicate]).map((t) => t.id), ["l1", "l2"], "legacy alone is only de-duplicated");
});

test("turnsToMessages makes a stable user/assistant pair per turn", () => {
  const messages = turnsToMessages([turn("t1", { personId: null })]);
  assert.deepEqual(messages.map((m) => [m.id, m.role, m.content, m.status]), [["history-t1-user", "user", "q-t1", "complete"], ["history-t1-assistant", "assistant", "a-t1", "complete"]]);
});

test("mergeHydratedHistory puts history first and never shows an exchange twice", () => {
  const history = turnsToMessages([turn("t1"), turn("t2")]);
  const live = [
    { id: "1", role: "user", content: "q-t2", status: "complete" }, { id: "2", role: "assistant", content: "a-t2", status: "complete" },
    { id: "3", role: "user", content: "Нове", status: "complete" }, { id: "4", role: "assistant", content: "", status: "streaming" },
  ];
  const merged = mergeHydratedHistory(history, live);
  assert.deepEqual(merged.map((m) => m.content), ["q-t1", "a-t1", "q-t2", "a-t2", "Нове", ""]);
  assert.deepEqual(mergeHydratedHistory(history, []).map((m) => m.content), ["q-t1", "a-t1", "q-t2", "a-t2"]);
  assert.deepEqual(mergeHydratedHistory([], live), live);
});

test("static guard: the history reader is read-only, owner-filtered and never touches memory or AI", async () => {
  const client = await readFile(path.join(root, "src/lib/happybot/chatHistoryClient.ts"), "utf8");
  const pure = await readFile(path.join(root, "src/lib/happybot/chatHistory.ts"), "utf8");
  const code = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  for (const source of [code(client), code(pure)]) {
    assert.doesNotMatch(source, /\.(insert|update|upsert|delete|rpc)\s*\(/);
    assert.doesNotMatch(source, /happy_conversation_summaries|happy_shown_ideas|knowledge|memories|\/api\/ai-chat|\bfetch\s*\(|localStorage|sessionStorage/i);
  }
  assert.match(client, /\.from\("happy_chat_turns"\)/);
  assert.match(client, /\.eq\("user_id", input\.ownerId\)/);
  assert.match(client, /sessionMatchesOwner/);
});

test("static guard: the modal restores history once per instance and waits for it before sending", async () => {
  const modal = await readFile(path.join(root, "src/components/ChatAssistantModal.tsx"), "utf8");
  assert.match(modal, /hydratedRef/);
  assert.match(modal, /historySegmentFor\(scope, giftRequest\)/);
  assert.match(modal, /historyStatus === "idle" \|\| historyStatus === "loading"/);
  assert.match(modal, /ownerIdRef\.current !== owner/);
});

test("static guard: the profile history reads happy_chat_turns first and de-duplicates the legacy table", async () => {
  const repository = await readFile(path.join(root, "src/lib/repositories/personHappyConversationRepository.ts"), "utf8");
  assert.match(repository, /from\("happy_chat_turns"\)/);
  assert.match(repository, /from\("person_happy_conversations"\)/);
  assert.match(repository, /mergeLegacyTurns/);
  assert.doesNotMatch(repository, /\.(insert|update|upsert|delete)\s*\(/);
});

test("this phase adds no migration, no new columns and no schema change", async () => {
  const { execFileSync } = await import("node:child_process");
  const changed = execFileSync("git", ["diff", "--name-only", "dd24f2091638e1d658eb0ed55ba1ed40a4442696", "HEAD"], { cwd: root, encoding: "utf8" });
  assert.doesNotMatch(changed, /^supabase\//m);
});
