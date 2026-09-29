import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("person Happy counters use current owner/person task and idea lifecycle states only", async () => {
  const repository = await source("src/lib/repositories/personHappyStatusRepository.ts");
  assert.match(repository, /from\("happy_tasks"\)[\s\S]*?select\("id", \{ count: "exact", head: true \}\)[\s\S]*?eq\("user_id", userId\)[\s\S]*?eq\("person_id", personId\)[\s\S]*?in\("status", \["waiting_user", "active", "paused"\]\)/);
  assert.match(repository, /from\("happy_ideas"\)[\s\S]*?select\("id", \{ count: "exact", head: true \}\)[\s\S]*?eq\("user_id", userId\)[\s\S]*?eq\("person_id", personId\)[\s\S]*?in\("status", \["new", "shown"\]\)/);
  assert.doesNotMatch(repository, /select\("\*"/);
  assert.doesNotMatch(repository, /service_role|SUPABASE_SERVICE_ROLE_KEY/);
});

test("terminal tasks and ideas, other people, and other owners cannot enter the counters", async () => {
  const repository = await source("src/lib/repositories/personHappyStatusRepository.ts");
  assert.doesNotMatch(repository, /completed|cancelled|accepted|dismissed|expired/);
  assert.match(repository, /eq\("user_id", userId\).*eq\("person_id", personId\)/s);
});

test("profile loader verifies the owned person before bounded Happy counter reads and makes no AI call", async () => {
  const loader = await source("src/lib/people/people.loaders.ts");
  const ownership = loader.indexOf("getOwnedPersonById(userId, personId)");
  const happy = loader.indexOf("getPersonHappyStatus(userId, personId)");
  assert.ok(ownership >= 0 && happy > ownership);
  assert.match(loader, /getPersonHappyStatus\(userId, personId\),\n\s*\]\);/);
  assert.match(loader, /happyConversations, happy,/);
  assert.doesNotMatch(loader, /openai|provider|createAssistantChatResponse|\/api\/ai-chat/i);
});

test("view model exposes zero-safe compact Happy counts instead of database rows", async () => {
  const types = await source("src/lib/people/peopleData.types.ts");
  const models = await source("src/lib/people/buildPeopleViewModels.ts");
  assert.match(types, /happy: \{\s*activeTaskCount: number;\s*currentIdeaCount: number;/s);
  assert.match(models, /happy = \{ activeTaskCount: 0, currentIdeaCount: 0 \}/);
  assert.match(models, /happy: \{ activeTaskCount: 0, currentIdeaCount: 0 \}/);
});

test("profile card renders the compact counts and binds its CTA to the persisted profile id", async () => {
  const profile = await source("src/components/people/PersonProfileContent.tsx");
  assert.match(profile, /<HappyPersonSection personName=\{hero\.name\} happy=\{viewModel\.happy\}/);
  assert.match(profile, /initialPersonId=\{hero\.id\}/);
  assert.match(profile, /initialPerson=\{\{/);
  assert.match(profile, /t\("profileUi\.happy\.tasks", \{ count: happy\.activeTaskCount \}\)/);
  assert.match(profile, /t\("profileUi\.happy\.ideas", \{ count: happy\.currentIdeaCount \}\)/);
  assert.match(profile, /t\("profileUi\.happy\.ask", \{ name: personName \}\)/);
  assert.doesNotMatch(profile, /resolveChatPerson/);
  const modal = await source("src/components/ChatAssistantModal.tsx");
  assert.match(modal, /if \(isProfileScoped && initialPersonId\) \{/);
  assert.match(modal, /personScope: homeContext\.isAuthenticated && isProfileScoped \? "profile" : null/);
});

test("profile-scoped chat preserves only the verified current person and excludes unrelated people/events", async () => {
  const server = await source("src/lib/assistant/verifiedAssistantContext.server.ts");
  assert.match(server, /requestedPersonId = request\.context\.personScope === "profile" && request\.context\.personResolutionStatus === "resolved"/);
  assert.match(server, /data\.people\.filter\(\(person\) => person\.id === requestedPersonId\)/);
  assert.match(server, /isPersonScoped \? scopedPeople : brains\.conversation\.assistantPeople/);
  assert.match(server, /const memories = isPersonScoped\s*\? buildAssistantMemoryContextFromSemanticMemory/s);
  assert.match(server, /\.filter\(\(event\) => !isPersonScoped \|\| event\.personId === requestedPersonId\)/);
});

test("a foreign or nonexistent requested profile id never becomes an active server context", async () => {
  const server = await source("src/lib/assistant/verifiedAssistantRequest.ts");
  const api = await source("src/app/api/ai-chat/route.ts");
  assert.match(server, /verified\.people\.find\(\(\{ id \}\) => id === requestedPersonId\) \?\? null/);
  assert.match(api, /createAssistantRlsClient/);
  assert.doesNotMatch(api, /SUPABASE_SERVICE_ROLE_KEY|service_role/);
});

test("general Home chat remains backward compatible without an initial profile target", async () => {
  const modal = await source("src/components/ChatAssistantModal.tsx");
  assert.match(modal, /initialPersonId\?: string \| null;/);
  assert.match(modal, /initialPerson\?: AssistantPersonContext \| null;/);
  assert.match(modal, /initialPersonId = null, initialPerson = null/);
  assert.match(modal, /resolveChatPerson\(\{/);
});

test("all locales provide zero, singular/plural, and CTA copy for the Happy section", async () => {
  for (const locale of ["uk", "pl", "en", "de", "ru"]) {
    const messages = JSON.parse(await source(`messages/${locale}/person.json`));
    const happy = messages.profileUi?.happy;
    assert.ok(happy, `${locale} Happy copy is present`);
    assert.match(happy.title, /\{name\}/);
    assert.match(happy.ask, /\{name\}/);
    assert.match(happy.tasks, /=0/);
    assert.match(happy.tasks, /one/);
    assert.match(happy.ideas, /=0/);
    assert.match(happy.ideas, /one/);
  }
});
