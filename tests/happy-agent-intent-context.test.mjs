import assert from "node:assert/strict";
import test from "node:test";

const { HAPPY_AGENT_INTENT_BUDGETS } = await import("../src/lib/happy/agent-context/happyAgentContextBudget.ts");
const { selectHappyAgentContextForIntent } = await import("../src/lib/happy/agent-context/selectHappyAgentContextForIntent.ts");

const date = (index) => `2026-01-${String((index % 28) + 1).padStart(2, "0")}`;
const knowledge = (kind, index, polarity = null) => ({ id: `${kind}-${index}`, text: `${kind} ${index}`, importance: index % 6, kind, category: kind, polarity, occurredOn: date(index) });
const context = () => ({
  user: { id: "user-a", locale: "uk", timezone: "Europe/Warsaw" },
  person: { id: "person-a", name: "A", relationship: "friend", birthday: "2000-01-01", gender: null },
  event: { id: "event-a", type: "birthday", date: "2026-01-20", daysUntil: 10 },
  knowledge: {
    likes: Array.from({ length: 20 }, (_, i) => knowledge("like", i, "likes")),
    dislikes: Array.from({ length: 20 }, (_, i) => knowledge("dislike", i, "dislikes")),
    interests: Array.from({ length: 20 }, (_, i) => knowledge("interest", i)),
    importantFacts: Array.from({ length: 20 }, (_, i) => knowledge("fact", i)),
  },
  memories: Array.from({ length: 20 }, (_, i) => ({ id: `memory-${i}`, text: `memory ${i}`, epistemicType: "memory", authority: "user" })),
  gifts: {
    previous: Array.from({ length: 20 }, (_, i) => ({ id: `previous-${i}`, title: `previous ${i}`, lifecycle: "given", eventId: null, createdAt: `${date(i)}T00:00:00Z` })),
    planned: Array.from({ length: 20 }, (_, i) => ({ id: `planned-${i}`, title: `planned ${i}`, lifecycle: "selected", eventId: null, createdAt: `${date(i)}T00:00:00Z` })),
  },
  activeTasks: [
    ...Array.from({ length: 20 }, (_, i) => ({ id: `birthday-task-${i}`, type: "birthday_gift", title: "not used", status: i === 0 ? "waiting_user" : "active", personId: "person-a", eventId: "event-a", startedAt: `${date(i)}T00:00:00Z` })),
    { id: "completed", type: "birthday_gift", title: "not used", status: "completed", personId: "person-a", eventId: "event-a", startedAt: "2099-01-01T00:00:00Z" },
    { id: "greeting-task", type: "write_greeting", title: "not used", status: "active", personId: "person-a", eventId: "event-a", startedAt: "2026-02-01T00:00:00Z" },
    { id: "unrelated", type: "other", title: "birthday free text must not match", status: "active", personId: "person-a", eventId: "event-a", startedAt: "2026-03-01T00:00:00Z" },
  ],
  activeIdeas: [
    ...Array.from({ length: 20 }, (_, i) => ({ id: `gift-idea-${i}`, type: "gift", title: `idea ${i}`, message: "safe", status: "new", personId: "person-a", eventId: "event-a", expiresAt: null, createdAt: `${date(i)}T00:00:00Z` })),
    { id: "greeting-idea", type: "write_greeting", title: "not used", message: "safe", status: "new", personId: "person-a", eventId: "event-a", expiresAt: null, createdAt: "2026-02-01T00:00:00Z" },
  ],
  recentActions: [
    ...Array.from({ length: 20 }, (_, i) => ({ id: `action-${i}`, type: "save_gift", status: "pending", taskId: `birthday-task-${i}`, stepId: null, executedAt: null, createdAt: `${date(i)}T00:00:00Z` })),
    { id: "greeting-action", type: "draft", status: "pending", taskId: "greeting-task", stepId: null, executedAt: null, createdAt: "2026-02-01T00:00:00Z" },
    { id: "unrelated-action", type: "save", status: "pending", taskId: "unrelated", stepId: null, executedAt: null, createdAt: "2026-03-01T00:00:00Z" },
  ],
});

const projected = (input, intent) => {
  const result = selectHappyAgentContextForIntent(input, intent);
  assert.equal(result.kind, "ok");
  return result.context;
};

test("birthday_gift applies its small deterministic profile without expanding source context", () => {
  const source = context();
  const before = structuredClone(source);
  const result = projected(source, "birthday_gift");
  const budget = HAPPY_AGENT_INTENT_BUDGETS.birthday_gift;
  assert.equal(result.person?.id, "person-a");
  assert.equal(result.event?.id, "event-a");
  assert.equal(result.knowledge?.likes?.length, budget.likes);
  assert.equal(result.knowledge?.dislikes?.length, budget.dislikes);
  assert.equal(result.knowledge?.interests?.length, budget.interests);
  assert.equal(result.knowledge?.importantFacts?.length, budget.importantFacts);
  assert.equal(result.memories?.length, budget.memories);
  assert.equal(result.gifts?.previous?.length, 5);
  assert.equal(result.gifts?.planned?.length, budget.plannedGifts);
  assert.equal(result.activeTasks?.length, budget.tasks);
  assert.equal(result.activeTasks?.[0].id, "birthday-task-0");
  assert(!result.activeTasks?.some((task) => task.id === "completed"));
  assert.equal(result.activeIdeas?.length, budget.ideas);
  assert.equal(result.recentActions?.length, budget.actions);
  assert(!JSON.stringify(result).includes("unrelated-action"));
  assert(!JSON.stringify(result).includes("payload"));
  assert(!JSON.stringify(result).includes("evidence"));
  assert.deepEqual(source, before);
  assert.deepEqual(projected(source, "birthday_gift"), result);
});

test("write_greeting prioritizes canonical memories, keeps gifts and unrelated work absent, and invents no tone", () => {
  const result = projected(context(), "write_greeting");
  const budget = HAPPY_AGENT_INTENT_BUDGETS.write_greeting;
  assert.equal(result.person?.name, "A");
  assert.equal(result.event?.type, "birthday");
  assert.equal(result.memories?.length, budget.memories);
  assert(result.memories.length > HAPPY_AGENT_INTENT_BUDGETS.birthday_gift.memories);
  assert.equal(result.knowledge?.importantFacts?.length, budget.importantFacts);
  assert.equal(result.knowledge?.likes?.length, budget.likes);
  assert.equal(result.knowledge?.dislikes?.length, budget.dislikes);
  assert.equal(result.gifts, undefined);
  assert.deepEqual(result.activeTasks?.map((task) => task.id), ["greeting-task"]);
  assert.equal(result.activeIdeas, undefined);
  assert.deepEqual(result.recentActions?.map((action) => action.id), ["greeting-action"]);
  assert.equal("tone" in result, false);
  assert.equal("personality" in result, false);
});

test("unknown runtime intent fails closed and every emitted collection respects its configured limit", () => {
  const source = context();
  assert.deepEqual(selectHappyAgentContextForIntent(source, "gift_follow_up"), { kind: "unsupported_intent", intent: "gift_follow_up" });
  for (const intent of ["birthday_gift", "write_greeting"]) {
    const result = projected(source, intent);
    const budget = HAPPY_AGENT_INTENT_BUDGETS[intent];
    assert((result.knowledge?.likes?.length ?? 0) <= budget.likes);
    assert((result.knowledge?.dislikes?.length ?? 0) <= budget.dislikes);
    assert((result.knowledge?.interests?.length ?? 0) <= budget.interests);
    assert((result.knowledge?.importantFacts?.length ?? 0) <= budget.importantFacts);
    assert((result.memories?.length ?? 0) <= budget.memories);
    assert((result.gifts?.previous?.length ?? 0) <= budget.previousGifts);
    assert((result.gifts?.planned?.length ?? 0) <= budget.plannedGifts);
    assert((result.activeTasks?.length ?? 0) <= budget.tasks);
    assert((result.activeIdeas?.length ?? 0) <= budget.ideas);
    assert((result.recentActions?.length ?? 0) <= budget.actions);
  }
});
