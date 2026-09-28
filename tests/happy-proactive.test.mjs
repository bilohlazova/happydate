import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rules = await import("../supabase/functions/happy-proactive/proactive-rules.ts");
const migration = await readFile(path.join(root, "supabase/migrations/20260928161702_birthday_proactive_intelligence.sql"), "utf8");
const cronMigration = await readFile(path.join(root, "supabase/migrations/20260928080935_add_happy_proactive_birthday_dedupe_and_cron.sql"), "utf8");
const functionSource = await readFile(path.join(root, "supabase/functions/happy-proactive/index.ts"), "utf8");
const rulesSource = await readFile(path.join(root, "supabase/functions/happy-proactive/proactive-rules.ts"), "utf8");
const boundaryDocumentation = await readFile(path.join(root, "supabase/functions/happy-proactive/README.md"), "utf8");

const now = new Date("2026-09-28T10:00:00.000Z");
const candidate = (overrides = {}) => ({
  eventId: "11111111-1111-4111-8111-111111111111",
  userId: "22222222-2222-4222-8222-222222222222",
  personId: "33333333-3333-4333-8333-333333333333",
  occurrenceDate: "2026-10-28",
  personOwnerId: "22222222-2222-4222-8222-222222222222",
  locale: "uk",
  hasActiveTask: false,
  hasPreparedGift: false,
  hasGreetingPrepared: false,
  existingIdeaStatuses: {},
  ...overrides,
});

function writer() {
  const ideas = new Set();
  const notifications = new Set();
  return {
    ideas,
    notifications,
    createIdea: async (_candidate, _rule, key) => {
      if (ideas.has(key)) return false;
      ideas.add(key);
      return true;
    },
    createGiftMissingNotification: async (_candidate, key) => {
      if (notifications.has(key)) return false;
      notifications.add(key);
      return true;
    },
  };
}

function decision(input) {
  const result = rules.decideBirthdayProactive(input, now);
  assert.equal(result.kind, "process");
  return result;
}

test("30 and 15 days create only start_gift_planning", () => {
  for (const occurrenceDate of ["2026-10-28", "2026-10-13"]) {
    const result = decision(candidate({ occurrenceDate }));
    assert.deepEqual(result.ideaRules, ["start_gift_planning"]);
    assert.equal(result.notifyGiftMissing, false);
  }
});

test("14 days switches to gift_help, and active task or prepared gift suppress it", () => {
  assert.deepEqual(decision(candidate({ occurrenceDate: "2026-10-12" })).ideaRules, ["gift_help"]);
  const active = decision(candidate({ occurrenceDate: "2026-10-08", hasActiveTask: true }));
  assert.deepEqual(active.ideaRules, []);
  assert.equal(active.skippedActiveTask, true);
  assert.equal(rules.decideBirthdayProactive(candidate({ occurrenceDate: "2026-10-08", hasPreparedGift: true }), now).reason, "giftPrepared");
});

test("five days creates gift_help and one occurrence-specific gift_missing notification", async () => {
  const db = writer();
  const input = candidate({ occurrenceDate: "2026-10-03" });
  const first = await rules.runBirthdayProactive([input], now, db);
  const second = await rules.runBirthdayProactive([input], now, db);
  assert.deepEqual(first.ideasCreated, { startGiftPlanning: 0, giftHelp: 1, prepareGreeting: 0 });
  assert.deepEqual(first.notificationsCreated, { giftMissing: 1 });
  assert.deepEqual(second.ideasCreated, { startGiftPlanning: 0, giftHelp: 0, prepareGreeting: 0 });
  assert.deepEqual(second.notificationsCreated, { giftMissing: 0 });
});

test("one day without gift keeps unresolved rules but never invents prepare_greeting", () => {
  const result = decision(candidate({ occurrenceDate: "2026-09-29" }));
  assert.deepEqual(result.ideaRules, ["gift_help"]);
  assert.equal(result.notifyGiftMissing, true);
});

test("one day with a prepared gift creates prepare_greeting unless its durable step is completed", () => {
  const waiting = decision(candidate({ occurrenceDate: "2026-09-29", hasPreparedGift: true }));
  assert.deepEqual(waiting.ideaRules, ["prepare_greeting"]);
  assert.equal(waiting.notifyGiftMissing, false);
  const prepared = decision(candidate({ occurrenceDate: "2026-09-29", hasPreparedGift: true, hasGreetingPrepared: true }));
  assert.deepEqual(prepared.ideaRules, []);
  assert.equal(prepared.skippedGreetingPrepared, true);
  assert.match(migration, /step\.type = 'prepare_greeting'[\s\S]*step\.status = 'completed'/);
});

test("today and out-of-window birthdays do not create a day-one greeting or any future candidate", () => {
  const today = decision(candidate({ occurrenceDate: "2026-09-28" }));
  assert.deepEqual(today.ideaRules, ["gift_help"]);
  assert.equal(today.notifyGiftMissing, true);
  assert.equal(rules.decideBirthdayProactive(candidate({ occurrenceDate: "2026-10-29" }), now).reason, "invalidTarget");
});

test("semantic rules have independent keys while same rule remains durable across terminal states", () => {
  const start = candidate({ occurrenceDate: "2026-10-12" });
  assert.notEqual(rules.proactiveIdeaKey("start_gift_planning", start), rules.proactiveIdeaKey("gift_help", start));
  for (const status of ["accepted", "dismissed", "expired"]) {
    const result = decision(candidate({ occurrenceDate: "2026-10-12", existingIdeaStatuses: { gift_help: status } }));
    assert.deepEqual(result.ideaRules, []);
    assert.equal(result.existingIdeas, 1);
  }
  const later = decision(candidate({ occurrenceDate: "2026-10-12", existingIdeaStatuses: { start_gift_planning: "dismissed" } }));
  assert.deepEqual(later.ideaRules, ["gift_help"]);
});

test("users and birthday occurrences remain independent", () => {
  const base = candidate({ occurrenceDate: "2026-10-03" });
  assert.notEqual(
    rules.proactiveGiftMissingNotificationKey(base),
    rules.proactiveGiftMissingNotificationKey(candidate({ occurrenceDate: "2026-10-03", userId: "44444444-4444-4444-8444-444444444444", personOwnerId: "44444444-4444-4444-8444-444444444444" })),
  );
  assert.notEqual(rules.proactiveIdeaKey("gift_help", base), rules.proactiveIdeaKey("gift_help", candidate({ occurrenceDate: "2027-10-03" })));
});

test("owner mismatch and no candidates are safe no-ops", async () => {
  assert.equal(rules.decideBirthdayProactive(candidate({ personOwnerId: "foreign-user" }), now).reason, "invalidTarget");
  assert.deepEqual(await rules.runBirthdayProactive([], now, writer()), {
    scannedCandidates: 0,
    ideasCreated: { startGiftPlanning: 0, giftHelp: 0, prepareGreeting: 0 },
    notificationsCreated: { giftMissing: 0 },
    skipped: { giftPrepared: 0, activeTask: 0, greetingPrepared: 0, existingIdea: 0, invalidTarget: 0 },
  });
  assert.match(functionSource, /scannedCandidates: 0,[\s\S]*ideasCreated: \{ startGiftPlanning: 0, giftHelp: 0, prepareGreeting: 0 \}/);
});

test("database RPCs revalidate gift state and protect concurrent inserts", () => {
  assert.match(migration, /gift\.lifecycle in \('selected', 'purchased'\)/);
  assert.match(migration, /on conflict \(user_id, proactive_key\) do nothing/i);
  assert.match(migration, /on conflict \(user_id, dedupe_key\) do nothing/i);
  assert.match(migration, /person\.user_id = p_user_id/);
  assert.match(migration, /security definer\s+set search_path = ''/i);
});

test("candidate scan is UTC calendar bounded, profile-localized, and has no AI/provider path", () => {
  assert.equal(rules.PROACTIVE_LOOKAHEAD_DAYS, 30);
  assert.equal(rules.PROACTIVE_MAX_CANDIDATES, 100);
  assert.match(functionSource, /\.eq\("category", "birthday"\)/);
  assert.match(functionSource, /\.limit\(PROACTIVE_MAX_CANDIDATES\)/);
  assert.match(functionSource, /from\("profiles"\)\.select\("id,preferred_locale"\)/);
  assert.match(functionSource, /from\("happy_task_steps"\)\.select\("task_id,type,status"\)/);
  assert.doesNotMatch(functionSource, /openai|happyAgentProvider|\/api\/happy\/agent|structured.?output/i);
  assert.doesNotMatch(`${functionSource}\n${migration}`, /console\.(log|error)\([^)]*(title|message|name|note|memory|knowledge)/i);
});

test("Cron-to-RPC proactive path remains deterministic and cannot invoke AI", () => {
  const executablePath = `${cronMigration}\n${functionSource}\n${rulesSource}\n${migration}`;
  assert.match(cronMigration, /net\.http_post\(/);
  assert.match(functionSource, /admin\.rpc\("try_create_happy_proactive_birthday_idea"/);
  assert.match(functionSource, /admin\.rpc\("try_create_happy_proactive_birthday_gift_missing_notification"/);
  assert.doesNotMatch(executablePath, /openai|happyAgentProvider|\/api\/happy\/agent|ai-chat|structured.?output|chat\.completions|responses\.create/i);
  assert.match(boundaryDocumentation, /must not call an AI provider/i);
  assert.match(boundaryDocumentation, /AI must not decide whether an event is in range/i);
});

test("proactive copy is deterministic, localized, and never uses semantic keys as visible copy", () => {
  assert.match(functionSource, /from\("profiles"\)\.select\("id,preferred_locale"\)/);
  assert.match(functionSource, /preferredLocale === "uk"[\s\S]*: "en"/);
  for (const locale of ["uk", "pl", "de", "ru"]) {
    assert.equal((migration.match(new RegExp(`when '${locale}' then`, "g")) ?? []).length, 8);
  }
  for (const copy of [
    "Час подумати про подарунок",
    "Potrzebujesz pomocy z prezentem?",
    "Zeit, über ein Geschenk nachzudenken",
    "Пора подумать о подарке",
    "Time to think about a gift",
    "Підготуйте привітання",
    "Przygotuj życzenia",
    "Bereite einen Gruß vor",
    "Подготовьте поздравление",
    "Prepare a greeting",
    "Подарунок ще не готовий",
    "Prezent nie jest jeszcze gotowy",
    "Das Geschenk ist noch nicht bereit",
    "Подарок ещё не готов",
    "The gift is not ready yet",
  ]) assert.match(migration, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(migration, /'birthday:' \|\| p_rule \|\| ':' \|\| p_event_id::text/);
  assert.match(migration, /'birthday:gift_missing:' \|\| p_user_id::text/);
  assert.doesNotMatch(migration, /values \([^)]*'start_gift_planning'[^)]*'start_gift_planning'/i);
  assert.doesNotMatch(migration, /values \([^)]*'gift_missing'[^)]*'gift_missing'/i);
});
