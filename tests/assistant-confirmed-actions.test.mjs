import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("Assistant event action opens a calendar draft and never writes directly", async () => {
  const [assistant, calendar] = await Promise.all([
    read("src/components/ChatAssistantModal.tsx"),
    read("src/app/(app)/dashboard/page.tsx"),
  ]);
  assert.match(assistant, /destination: "\/dashboard\?action=add-event"/);
  assert.match(assistant, /router\.push\(destination\)/);
  assert.doesNotMatch(assistant, /createCalendarEvent|\.from\("events"\)|insert\(/);
  assert.match(calendar, /const action = searchParams\.get\("action"\)/);
  assert.match(calendar, /action !== "add-event" && action !== "plan-day"/);
  assert.match(calendar, /openAdd\(\)/);
  assert.match(calendar, /disabled=\{!title \|\| !date\}/);
  assert.match(calendar, /onSubmit=\{createEvent\}/);
  assert.match(calendar, /people\.some\(\(person\) => person\.id === requestedDraft\.personId\)/);
  assert.match(calendar, /openAdd\(undefined, safePersonId\)/);
});

test("Assistant person navigation is explicit while conversational actions remain prompts", async () => {
  const assistant = await read("src/components/ChatAssistantModal.tsx");
  assert.match(assistant, /id: "people", icon: Users, destination: "\/people"/);
  assert.match(assistant, /if \(action\.destination\)/);
  assert.match(assistant, /setValue\(action\.prompt\)/);
});

test("Assistant day planning opens a Calendar-owned confirmation draft", async () => {
  const assistant = await read("src/components/ChatAssistantModal.tsx");
  assert.match(assistant, /id: "dayPlan", icon: CalendarCheck2, destination: "\/dashboard\?action=plan-day"/);
  assert.doesNotMatch(assistant, /updateCalendarEvent|createCalendarEvent/);
});

test("Assistant note action opens an empty Notes-owned confirmation draft", async () => {
  const [assistant, notes] = await Promise.all([
    read("src/components/ChatAssistantModal.tsx"),
    read("src/app/notes/NotesPageContent.tsx"),
  ]);
  assert.match(assistant, /id: "note", icon: NotebookPen, destination: "\/notes\?action=add-note"/);
  assert.doesNotMatch(assistant, /createNotesMemory|\.from\("memories"\)|insert\(/);
  assert.match(notes, /url\.searchParams\.get\("action"\) !== "add-note"/);
  assert.match(notes, /url\.searchParams\.delete\("action"\)/);
  assert.match(notes, /url\.searchParams\.get\("personId"\)/);
  assert.match(notes, /people\.some\(\(person\) => person\.id === requestedDraft\.personId\)/);
  assert.match(notes, /queueMicrotask\(\(\) => openNew\("note", safePersonId\)\)/);
  assert.match(notes, /onSubmit=\{saveMemory\}/);
  assert.match(notes, /await createNotesMemory\(/);
});

test("Assistant carries only a resolved owned person into the note draft", async () => {
  const [assistant, notes, editor] = await Promise.all([
    read("src/components/ChatAssistantModal.tsx"),
    read("src/app/notes/NotesPageContent.tsx"),
    read("src/components/notes/MemoryEditorSheet.tsx"),
  ]);
  assert.match(assistant, /personContext\.resolutionStatus === "resolved"/);
  assert.match(assistant, /encodeURIComponent\(personContext\.activePersonId\)/);
  assert.match(assistant, /actions\.find\(\(action\) => action\.id === "note"\)/);
  assert.match(assistant, /t\("context\.addNote"\)/);
  assert.match(assistant, /actions\.find\(\(action\) => action\.id === "event"\)/);
  assert.match(assistant, /t\("context\.addEvent"\)/);
  assert.match(assistant, /actions\.find\(\(action\) => action\.id === "gift"\)/);
  assert.match(assistant, /setValue\(t\("context\.giftPrompt", \{ name: activePerson\.name \}\)\)/);
  assert.match(notes, /const safePersonId = requestedDraft\.personId/);
  assert.match(notes, /initialPersonId=\{editingMemory \? "" : selectedNewPersonId\}/);
  assert.match(editor, /mode === "create" && initialState\.editorType !== "journal"/);
  assert.match(editor, /personId: initialPersonId/);
});

test("Assistant note action is localized in every supported language", async () => {
  for (const locale of ["uk", "pl", "en", "de", "ru"]) {
    const messages = JSON.parse(await read(`messages/${locale}/assistant.json`));
    assert.ok(messages.actions.note.title.trim(), locale);
    assert.ok(messages.actions.note.description.trim(), locale);
    assert.ok(messages.actions.note.prompt.trim(), locale);
    assert.ok(messages.context.addNote.trim(), locale);
    assert.ok(messages.context.addEvent.trim(), locale);
    assert.ok(messages.context.gift.trim(), locale);
    assert.ok(messages.context.giftHelp.includes("{name}"), locale);
    assert.ok(messages.context.giftPrompt.includes("{name}"), locale);
  }
});

test("chat knowledge writes continue through signed user confirmation", async () => {
  const [modal, conversation, client] = await Promise.all([
    read("src/components/ChatAssistantModal.tsx"),
    read("src/components/chat-assistant/ConversationView.tsx"),
    read("src/lib/happy-learning/happyLearningClient.ts"),
  ]);
  assert.match(conversation, /<HappyLearningCard/);
  assert.match(modal, /confirmHappyLearningCandidate/);
  assert.match(client, /detectionToken: candidate\.detectionToken/);
  assert.match(client, /MEMORY_CAPTURE_ENDPOINTS\.canonical\.confirm/);
});
