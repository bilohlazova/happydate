import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { buildBirthdayPreparationViewModel } from "../src/lib/events/eventPreparation.ts";

const event = { id: "event-a", title: "Birthday", date: "2026-10-10", category: "birthday", personId: "person-a" };
const task = (status, steps = []) => ({ id: `task-${status}`, type: "birthday_preparation", status, personId: "person-a", eventId: "event-a", startedAt: "2026-10-01T00:00:00Z", steps });
const model = (gifts = [], tasks = [], currentEvent = event) => buildBirthdayPreparationViewModel({ event: currentEvent, gifts, tasks });

test("birthday event exposes only durable gift, greeting and plan state", () => {
  assert.deepEqual(model(), { gift: "missing", greeting: "missing", plan: "none", canStartPreparation: true });
  assert.deepEqual(model([{ personId: "person-a", eventId: "event-a", lifecycle: "selected" }]), { gift: "ready", greeting: "missing", plan: "none", canStartPreparation: true });
  assert.equal(model([], [task("active")]).plan, "active");
  assert.equal(model([], [task("waiting_user")]).plan, "waiting_user");
  assert.equal(model([], [task("paused")]).plan, "paused");
  assert.deepEqual(model([], [task("completed", [{ type: "prepare_greeting", status: "completed" }])]), { gift: "missing", greeting: "ready", plan: "completed", canStartPreparation: false });
});

test("only a matching selected/purchased gift and matching greeting step count", () => {
  assert.equal(model([{ personId: "person-a", eventId: "event-a", lifecycle: "purchased" }]).gift, "ready");
  assert.equal(model([{ personId: "person-b", eventId: "event-a", lifecycle: "selected" }]).gift, "missing");
  assert.equal(model([{ personId: "person-a", eventId: "event-b", lifecycle: "selected" }]).gift, "missing");
  assert.equal(model([], [task("active", [{ type: "prepare_greeting", status: "active" }])]).greeting, "missing");
  assert.equal(model([], [task("active", [{ type: "prepare_greeting", status: "completed" }])]).greeting, "ready");
});

test("non-birthday events never receive the birthday preparation UI", () => {
  assert.equal(model([], [], { ...event, category: "anniversary" }), null);
});

test("Event route is owner-scoped, narrow and has no load-time writes", async () => {
  const source = await readFile("src/lib/events/eventPreparation.loader.ts", "utf8");
  assert.match(source, /\.eq\("user_id", userId\)/);
  assert.match(source, /select\("id,title,date,category,person_id"\)/);
  assert.doesNotMatch(source, /select\("\*"\)|\.insert\(|\.update\(|\.rpc\(/);
  assert.match(source, /\.eq\("person_id", event\.personId\)/);
  assert.match(source, /\.eq\("event_id", event\.id\)/);
});

test("the browser submits only eventId and the server derives all sensitive inputs", async () => {
  const [client, route, boundary] = await Promise.all([
    readFile("src/components/events/EventPreparationContent.tsx", "utf8"),
    readFile("src/app/api/happy/tasks/birthday-preparation/route.ts", "utf8"),
    readFile("src/lib/happy/task-engine/createBirthdayPreparationForEvent.server.ts", "utf8"),
  ]);
  assert.match(client, /JSON\.stringify\(\{ eventId: viewModel\.event\.id \}\)/);
  assert.match(client, /canStartPreparation/);
  assert.match(route, /z\.object\(\{ eventId: z\.string\(\)\.uuid\(\) \}\)\.strict\(\)/);
  assert.match(route, /getAssistantRequestIdentity/);
  assert.doesNotMatch(route, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(boundary, /\.eq\("user_id", input\.verifiedUserId\)/);
  assert.match(boundary, /createHappyTaskFromTemplate/);
  assert.match(boundary, /category\?\.trim\(\)\.toLocaleLowerCase\(\) !== "birthday"/);
});

test("event preparation copy is localized for all supported locales", async () => {
  const source = await readFile("src/lib/events/eventPreparationLabels.ts", "utf8");
  for (const locale of ["uk", "pl", "en", "de", "ru"]) assert.match(source, new RegExp(`${locale}: \\{`));
  assert.match(source, /Підготовка/);
  assert.match(source, /Подію/);
});
