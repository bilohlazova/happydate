import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const { selectPrimaryHappySignal, compareHappySignals, getHappySignalPriorityTuple, getIdeaSignalPriority } = await import("../src/lib/happy/signals/happySignalPriority.ts");
const { buildExistingHomeSignals, toPendingApprovalSignal, toTaskSignal, toIdeaSignal, toBirthdaySignal, toOccasionSignal, toRescueSignal } = await import("../src/lib/happy/signals/happySignalAdapters.ts");
const { hasMatchingBirthdayGift, resolveBirthdayUrgency } = await import("../src/lib/birthday/birthdayPresentation.ts");

const owner = "00000000-0000-4000-8000-000000000001";
const eventId = "00000000-0000-4000-8000-000000000010";
const personId = "00000000-0000-4000-8000-000000000011";
const now = new Date("2026-10-01T12:00:00.000Z");
const stepTypes = ["analyze_context", "analyze_gifts", "generate_gift_ideas", "choose_gift", "save_gift", "prepare_greeting"];
const taskSteps = stepTypes.map((type, index) => ({
  id: `00000000-0000-4000-8000-0000000000${20 + index}`,
  position: index + 1,
  type,
  status: "pending",
  requiresApproval: type === "save_gift",
}));

const action = (id, type = "save_gift", createdAt = "2026-09-20T00:00:00.000Z") => ({ id, userId: owner, type, status: "pending", createdAt });
const task = (id, status = "active", date = "2026-10-05") => ({
  id, userId: owner, type: "birthday_preparation", status, personId, eventId,
  contextSnapshot: { templateVersion: 1 }, personName: "Mia", eventDate: date, steps: taskSteps,
});
const idea = (id, type = "start_gift_planning", overrides = {}) => ({
  id, userId: owner, type, title: "Prepare", message: "Prepare a birthday", status: "new",
  personId, eventId, createdAt: "2026-09-20T00:00:00.000Z", ...overrides,
});
const birthday = (key, daysUntil, urgency = "normal", giftReady = false) => toBirthdaySignal({ occurrenceKey: key, eventId, personId, daysUntil, urgency, giftReady });
const occasion = (key, phase = "planning", recipientResolution = "resolved", daysUntil = 10) => toOccasionSignal({
  occurrence: { occasionKey: "pl_boys_day", occurrenceKey: key, countryCode: "PL", localDate: "2026-09-30", year: 2026, daysUntil, phase },
  people: recipientResolution === "resolved"
    ? { kind: "resolved", occasionKey: "pl_boys_day", occurrenceKey: key, personId }
    : { kind: "selection_required", occasionKey: "pl_boys_day", occurrenceKey: key, candidates: [] },
});

test("adapters keep only actionable existing Home sources", () => {
  assert.equal(toPendingApprovalSignal(action("approval-1"))?.kind, "pending_approval");
  assert.equal(toPendingApprovalSignal({ ...action("done"), status: "completed" }), null);
  assert.equal(toPendingApprovalSignal(action("non-level-3", "create_task")), null);
  assert.equal(toTaskSignal(task("task-1", "waiting_user"), now)?.kind, "task");
  assert.equal(toTaskSignal({ ...task("terminal"), status: "completed" }, now), null);
  assert.equal(toTaskSignal({ ...task("malformed"), steps: [] }, now), null);
  assert.equal(toIdeaSignal({ idea: idea("idea-1"), events: [{ id: eventId, date: "2026-10-05" }], now })?.kind, "idea");
  assert.equal(toIdeaSignal({ idea: idea("dismissed", "gift_help", { status: "dismissed" }), events: [], now }), null);
  assert.equal(toIdeaSignal({ idea: idea("blocked", "gift_help"), events: [], now, proactivityMode: "minimal" }), null);
  assert.equal(toIdeaSignal({ idea: idea("allowed", "gift_help"), events: [], now, proactivityMode: "balanced" })?.kind, "idea");
});

test("new signal union preserves birthday urgency, occasion resolution, and rescue placeholder", () => {
  const critical = birthday("2026-10-03", 2, "critical", false);
  assert.equal(critical?.kind, "birthday");
  assert.equal(critical?.urgency, "critical");
  assert.equal(critical?.giftReady, false);
  assert.equal(birthday("2026-10-03", 2, "critical", true)?.kind, "birthday");
  assert.equal(occasion("2026-pl_boys_day", "planning", "resolved")?.recipientResolution, "resolved");
  assert.equal(occasion("2026-pl_boys_day", "urgent", "selection_required")?.recipientResolution, "selection_required");
  assert.equal(toOccasionSignal({
    occurrence: { occasionKey: "pl_boys_day", occurrenceKey: "2026-pl_boys_day", countryCode: "PL", localDate: "2026-09-30", year: 2026, daysUntil: 10, phase: "planning" },
    people: { kind: "none", occasionKey: "pl_boys_day", occurrenceKey: "2026-pl_boys_day" },
  }), null);
  const rescue = { rescueKey: "occasion:pl_boys_day:2026:person-a", occasionKey: "pl_boys_day", occurrenceKey: "occasion:pl_boys_day:2026", personId: "person-a", phase: "urgent", missing: ["gift"], daysUntil: 1 };
  assert.equal(toRescueSignal(rescue)?.requiresAction, true);
  assert.equal(toRescueSignal({ ...rescue, rescueKey: "" }), null);
});

test("birthday urgency is resolved upstream from gift lifecycle before priority mapping", () => {
  const noGift = hasMatchingBirthdayGift([], personId, eventId);
  const selectedGift = hasMatchingBirthdayGift([{ personId, eventId, lifecycle: "selected" }], personId, eventId);
  assert.equal(resolveBirthdayUrgency({ occurrence: "2026-10-03", daysUntil: 2, giftReady: noGift }), "critical");
  assert.equal(resolveBirthdayUrgency({ occurrence: "2026-10-03", daysUntil: 2, giftReady: selectedGift }), "normal");
  assert.equal(birthday("2026-10-03", 2, "normal", true)?.urgency, "normal");
});

test("semantic comparator preserves approval > task > idea characterization", () => {
  const signals = buildExistingHomeSignals({
    actions: [action("approval")],
    tasks: [task("waiting", "waiting_user")],
    ideas: [idea("suggestion", "gift_help")],
    events: [{ id: eventId, date: "2026-10-05" }], now,
  });
  assert.equal(selectPrimaryHappySignal(signals)?.kind, "pending_approval");
  assert.equal(selectPrimaryHappySignal(signals.filter((signal) => signal.kind !== "pending_approval"))?.kind, "task");
  assert.equal(selectPrimaryHappySignal(signals.filter((signal) => signal.kind === "idea"))?.kind, "idea");
  const approvals = [
    toPendingApprovalSignal(action("approval-later", "save_gift", "2026-09-21T00:00:00.000Z")),
    toPendingApprovalSignal(action("approval-earlier", "save_gift", "2026-09-20T00:00:00.000Z")),
  ].filter(Boolean);
  assert.equal(selectPrimaryHappySignal(approvals)?.actionId, "approval-earlier");
});

test("task status and temporal ordering are semantic and deterministic", () => {
  const taskSignals = [toTaskSignal(task("paused", "paused", "2026-10-02"), now), toTaskSignal(task("active", "active", "2026-10-02"), now), toTaskSignal(task("waiting", "waiting_user", "2026-10-10"), now)].filter(Boolean);
  assert.equal(selectPrimaryHappySignal(taskSignals)?.taskId, "waiting");
  const activeSignals = [toTaskSignal(task("later", "active", "2026-10-08"), now), toTaskSignal(task("nearer", "active", "2026-10-02"), now)].filter(Boolean);
  assert.equal(selectPrimaryHappySignal(activeSignals)?.taskId, "nearer");
  const tied = [toTaskSignal(task("task-b", "active", "2026-10-02"), now), toTaskSignal(task("task-a", "active", "2026-10-02"), now)].filter(Boolean);
  assert.equal(selectPrimaryHappySignal(tied)?.taskId, "task-a");
});

test("idea semantic priority is high before normal, then createdAt/id, without proximity tie-break", () => {
  const high = toIdeaSignal({ idea: idea("high", "gift_help", { createdAt: "2026-09-22T00:00:00.000Z" }), events: [{ id: eventId, date: "2026-10-05" }], now });
  const normal = toIdeaSignal({ idea: idea("normal", "start_gift_planning", { createdAt: "2026-09-20T00:00:00.000Z" }), events: [], now });
  assert.equal(getIdeaSignalPriority(high), "high");
  assert.equal(selectPrimaryHappySignal([normal, high])?.ideaId, "high");
  const old = toIdeaSignal({ idea: idea("old", "start_gift_planning", { createdAt: "2026-09-20T00:00:00.000Z", eventId: null }), events: [], now });
  const newSoon = toIdeaSignal({ idea: idea("new-soon", "start_gift_planning", { createdAt: "2026-09-21T00:00:00.000Z", eventId: eventId }), events: [{ id: eventId, date: "2026-10-02" }], now });
  assert.equal(selectPrimaryHappySignal([newSoon, old])?.ideaId, "old");
});

test("birthday and occasion phases use temporal urgency while explicit work remains ahead", () => {
  assert.equal(selectPrimaryHappySignal([birthday("b", 2, "critical"), toIdeaSignal({ idea: idea("idea", "start_gift_planning"), events: [], now })])?.kind, "birthday");
  assert.equal(selectPrimaryHappySignal([toTaskSignal(task("active-work", "active", "2026-10-20"), now), birthday("b-normal", 10, "normal")])?.kind, "task");
  assert.equal(selectPrimaryHappySignal([occasion("o-today", "today", "resolved", 0), occasion("o-planning", "planning", "resolved", 10)])?.occurrenceKey, "o-today");
  assert.equal(selectPrimaryHappySignal([occasion("o-urgent", "urgent", "resolved", 2), occasion("o-preparing", "preparing", "resolved", 3)])?.occurrenceKey, "o-urgent");
  const explicit = toTaskSignal(task("work", "waiting_user", "2026-10-20"), now);
  assert.equal(selectPrimaryHappySignal([explicit, occasion("o-today", "today", "resolved", 0)])?.kind, "task");
});

test("selection-required occasion and rescue remain actionable signals", () => {
  const selection = occasion("o", "planning", "selection_required", 10);
  const passive = toIdeaSignal({ idea: idea("idea", "start_gift_planning"), events: [], now });
  assert.equal(selectPrimaryHappySignal([passive, selection])?.kind, "occasion");
  assert.equal(selectPrimaryHappySignal([passive, toRescueSignal({ rescueKey: "occasion:pl_boys_day:2026:person-a", occasionKey: "pl_boys_day", occurrenceKey: "occasion:pl_boys_day:2026", personId: "person-a", phase: "urgent", missing: ["gift"], daysUntil: 1 })])?.kind, "rescue");
});

test("selection is independent of input order and stable for equal keys", () => {
  const candidates = [
    toPendingApprovalSignal(action("approval")),
    toTaskSignal(task("task", "active", "2026-10-02"), now),
    toIdeaSignal({ idea: idea("idea", "gift_help"), events: [{ id: eventId, date: "2026-10-05" }], now }),
    birthday("b", 2, "critical"),
    occasion("o", "urgent", "resolved", 2),
  ].filter(Boolean);
  const permutations = [candidates, [...candidates].reverse(), [candidates[2], candidates[4], candidates[0], candidates[3], candidates[1]]];
  for (const permutation of permutations) assert.equal(selectPrimaryHappySignal(permutation)?.signalKey, "happy-signal:approval:approval");
  const equalBirthday = [birthday("2026-b", 4), birthday("2026-a", 4)];
  assert.equal(selectPrimaryHappySignal(equalBirthday)?.signalKey, "happy-signal:birthday:2026-a");
  assert.equal(compareHappySignals(equalBirthday[0], equalBirthday[1]) > 0, true);
  assert.equal(getHappySignalPriorityTuple(equalBirthday[0]).signalKey, equalBirthday[0].signalKey);
});

test("mode gating removes only proactive ideas; explicit task remains", () => {
  const signals = buildExistingHomeSignals({
    actions: [], tasks: [task("task", "waiting_user")], ideas: [idea("gift", "gift_help")], events: [], now, proactivityMode: "minimal",
  });
  assert.equal(signals.some((signal) => signal.kind === "task"), true);
  assert.equal(signals.some((signal) => signal.kind === "idea"), false);
});

test("the shared selector is pure and has no provider/database dependency", async () => {
  const selector = await readFile(new URL("../src/lib/happy/home/selectPrimaryHappyBlock.ts", import.meta.url), "utf8");
  const priority = await readFile(new URL("../src/lib/happy/signals/happySignalPriority.ts", import.meta.url), "utf8");
  const adapters = await readFile(new URL("../src/lib/happy/signals/happySignalAdapters.ts", import.meta.url), "utf8");
  assert.match(selector, /selectPrimaryHappySignal/);
  assert.doesNotMatch(`${selector}\n${priority}\n${adapters}`, /openai|provider|service_role|fetch\s*\(|\.(insert|update|delete)\s*\(/i);
});
