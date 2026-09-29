import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const { selectPrimaryHappyBlock } = await import("../src/lib/happy/home/selectPrimaryHappyBlock.ts");
const owner = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const event = "00000000-0000-4000-8000-000000000010";
const steps = ["analyze_context", "analyze_gifts", "generate_gift_ideas", "choose_gift", "save_gift", "prepare_greeting"].map((type, index) => ({ id: `00000000-0000-4000-8000-0000000000${20 + index}`, position: index + 1, type, status: "pending", requiresApproval: type === "save_gift" }));
const task = (id, status = "active", userId = owner, date = "2026-10-05") => ({ id, userId, type: "birthday_preparation", status, personId: "00000000-0000-4000-8000-000000000003", eventId: event, contextSnapshot: { templateVersion: 1 }, personName: "Mia", eventDate: date, steps });
const idea = (id, type = "start_gift_planning", overrides = {}) => ({ id, userId: owner, type, title: "Prepare", message: "Prepare a birthday", status: "new", personId: "00000000-0000-4000-8000-000000000003", eventId: event, createdAt: "2026-09-20T00:00:00.000Z", ...overrides });
const action = (id, type = "save_gift", overrides = {}) => ({ id, userId: owner, type, status: "pending", createdAt: "2026-09-20T00:00:00.000Z", ...overrides });
const context = (overrides = {}) => ({ userId: owner, now: new Date("2026-10-01T12:00:00.000Z"), actions: [], tasks: [], ideas: [], events: [{ id: event, date: "2026-10-05" }], ...overrides });

test("pending Level 3 approval beats a task and idea, while non-approval actions do not qualify", () => {
  assert.equal(selectPrimaryHappyBlock(context({ actions: [action("00000000-0000-4000-8000-000000000101")], tasks: [task("00000000-0000-4000-8000-000000000102", "waiting_user")], ideas: [idea("00000000-0000-4000-8000-000000000103", "gift_help")] }))?.type, "approval");
  assert.equal(selectPrimaryHappyBlock(context({ actions: [action("00000000-0000-4000-8000-000000000104", "create_task")], ideas: [idea("00000000-0000-4000-8000-000000000105")] }))?.type, "idea");
});

test("canonical task ordering wins over all ideas and remains deterministic", () => {
  const selected = selectPrimaryHappyBlock(context({ tasks: [task("00000000-0000-4000-8000-000000000201", "active", owner, "2026-10-04"), task("00000000-0000-4000-8000-000000000200", "active", owner, "2026-10-04"), task("00000000-0000-4000-8000-000000000202", "waiting_user")], ideas: [idea("00000000-0000-4000-8000-000000000203", "gift_help")] }));
  assert.equal(selected?.type, "task_progress");
  assert.equal(selected?.type === "task_progress" && selected.task.id, "00000000-0000-4000-8000-000000000202");
  const tied = selectPrimaryHappyBlock(context({ tasks: [task("00000000-0000-4000-8000-000000000201", "active", owner, "2026-10-04"), task("00000000-0000-4000-8000-000000000200", "active", owner, "2026-10-04")] }));
  assert.equal(tied?.type === "task_progress" && tied.task.id, "00000000-0000-4000-8000-000000000200");
});

test("high semantic ideas beat normal ideas; terminal and foreign rows never qualify", () => {
  const selected = selectPrimaryHappyBlock(context({ ideas: [idea("00000000-0000-4000-8000-000000000301"), idea("00000000-0000-4000-8000-000000000302", "gift_help")] }));
  assert.equal(selected?.type, "idea");
  assert.equal(selected?.type === "idea" && selected.idea.id, "00000000-0000-4000-8000-000000000302");
  assert.equal(selectPrimaryHappyBlock(context({ ideas: [idea("00000000-0000-4000-8000-000000000303", "prepare_greeting", { userId: other }), idea("00000000-0000-4000-8000-000000000304", "gift_help", { status: "dismissed" }), idea("00000000-0000-4000-8000-000000000305", "gift_help", { status: "expired" })], tasks: [task("00000000-0000-4000-8000-000000000306", "waiting_user", other)] })), null);
});

test("idea ties use created_at then id and empty eligible data returns null", () => {
  const selected = selectPrimaryHappyBlock(context({ ideas: [idea("00000000-0000-4000-8000-000000000401"), idea("00000000-0000-4000-8000-000000000400")] }));
  assert.equal(selected?.type === "idea" && selected.idea.id, "00000000-0000-4000-8000-000000000400");
  assert.equal(selectPrimaryHappyBlock(context()), null);
});

test("Home renders exactly one primary insertion between conversation and Upcoming, with no AI dependency", async () => {
  const dashboard = await readFile(new URL("../src/components/home-dashboard/HomeDashboard.tsx", import.meta.url), "utf8");
  const selector = await readFile(new URL("../src/lib/happy/home/selectPrimaryHappyBlock.ts", import.meta.url), "utf8");
  assert.equal((dashboard.match(/<HomePrimaryHappyBlock/g) ?? []).length, 1);
  assert.ok(dashboard.indexOf("<WellbeingCheckIn") < dashboard.indexOf("<HomePrimaryHappyBlock"));
  assert.ok(dashboard.indexOf("<HomePrimaryHappyBlock") < dashboard.indexOf("<UpcomingEventsSection"));
  assert.doesNotMatch(selector, /openai|provider|supabase|service_role/i);
});

test("Home repository keeps primary candidates owner-scoped, bounded, and projection-only", async () => {
  const repository = await readFile(new URL("../src/lib/repositories/home/home.repository.ts", import.meta.url), "utf8");
  for (const table of ["happy_tasks", "happy_actions", "happy_ideas"]) {
    const section = repository.slice(repository.indexOf(`from(\"${table}\")`), repository.indexOf(`from(\"${table}\")`) + 800);
    assert.match(section, /\.eq\("user_id", userId\)/);
    assert.match(section, /\.limit\((?:5|10)\)/);
    assert.doesNotMatch(section, /select\("\*"\)/);
  }
});
