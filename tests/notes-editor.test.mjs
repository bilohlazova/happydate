import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCreateNotesMemoryPayload,
  buildMemoryEditorCreateFields,
  buildMemoryEditorUpdatePatch,
  createMemoryEditorInitialState,
  validateMemoryEditorState,
} from "../src/lib/memories/notesMemoryTypes.ts";
import { assertPersistableMemoryImageValues } from "../src/lib/storage/memoryImages.ts";

const existingMemory = {
  type: "note",
  title: "Tytuł",
  content_text: "Treść",
  value_text: null,
  person_id: "person-1",
  occurred_on: "2026-07-10",
  images: ["user-1/existing.webp"],
};

function createState(type, overrides = {}) {
  return {
    ...createMemoryEditorInitialState({
      mode: "create",
      type,
      today: "2026-07-13",
    }),
    ...overrides,
  };
}

test("note requires a title or content", () => {
  assert.equal(validateMemoryEditorState(createState("note")).isValid, false);
  assert.equal(
    validateMemoryEditorState(createState("note", { title: "Tytuł" })).isValid,
    true
  );
});

test("memory requires content", () => {
  const result = validateMemoryEditorState(
    createState("memory", { title: "Bez opisu" })
  );
  assert.equal(result.isValid, false);
  assert.ok(result.errors.contentText);
});

test("gift requires a person", () => {
  const result = validateMemoryEditorState(
    createState("gift", { valueText: "Album" })
  );
  assert.equal(result.isValid, false);
  assert.ok(result.errors.personId);
});

test("gift requires value_text", () => {
  const result = validateMemoryEditorState(
    createState("gift", { personId: "person-1" })
  );
  assert.equal(result.isValid, false);
  assert.ok(result.errors.valueText);
});

test("journal requires content", () => {
  const result = validateMemoryEditorState(createState("journal"));
  assert.equal(result.isValid, false);
  assert.ok(result.errors.contentText);
});

test("journal initialization always clears person_id", () => {
  const editState = createMemoryEditorInitialState({
    mode: "edit",
    type: "journal",
    memory: { ...existingMemory, type: "journal", person_id: "malformed-link" },
  });
  assert.equal(createState("journal").personId, "");
  assert.equal(editState.personId, "");
});

test("gift initializes value_text separately from content_text", () => {
  const state = createMemoryEditorInitialState({
    mode: "edit",
    type: "gift",
    memory: {
      ...existingMemory,
      type: "gift",
      value_text: "Aparat analogowy",
      content_text: "Lubi fotografię",
    },
  });
  assert.equal(state.valueText, "Aparat analogowy");
  assert.equal(state.contentText, "Lubi fotografię");
});

test("memory uses occurred_on as a date-only value", () => {
  const fields = buildMemoryEditorCreateFields(
    createState("memory", {
      contentText: "Wyjazd",
      occurredOn: "2026-07-10",
    })
  );
  assert.equal(fields.occurredOn, "2026-07-10");
});

test("note does not submit occurred_on", () => {
  const fields = buildMemoryEditorCreateFields(
    createState("note", {
      title: "Notatka",
      occurredOn: "2026-07-10",
    })
  );
  assert.equal("occurredOn" in fields, false);
});

test("create payload contains only fields relevant to the selected type", () => {
  const fields = buildMemoryEditorCreateFields(
    createState("gift", {
      personId: "person-1",
      valueText: "Książka",
      contentText: "O fotografii",
      title: "Ukryty tytuł",
      occurredOn: "2026-07-10",
    })
  );
  const payload = buildCreateNotesMemoryPayload({ userId: "user-1", ...fields });

  assert.deepEqual(Object.keys(payload).sort(), [
    "content_text",
    "images",
    "is_active",
    "person_id",
    "source",
    "type",
    "user_id",
    "value_text",
  ]);
});

test("update does not clear hidden fields", () => {
  const patch = buildMemoryEditorUpdatePatch(
    createState("note", {
      title: "Tytuł",
      contentText: "Treść",
      valueText: "hidden gift value",
      occurredOn: "2026-07-10",
    })
  );
  assert.equal("valueText" in patch, false);
  assert.equal("occurredOn" in patch, false);
});

test("unknown legacy edit preserves the raw type", () => {
  const state = createMemoryEditorInitialState({
    mode: "edit",
    type: "restaurant",
    memory: { ...existingMemory, type: "restaurant" },
  });
  assert.equal(state.rawType, "restaurant");
  assert.equal(state.editorType, "other");
});

test("unknown legacy edit preserves hidden value_text", () => {
  const state = createMemoryEditorInitialState({
    mode: "edit",
    type: "restaurant",
    memory: {
      ...existingMemory,
      type: "restaurant",
      value_text: "Pierogarnia",
    },
  });
  const patch = buildMemoryEditorUpdatePatch(state);
  assert.equal(state.valueText, "Pierogarnia");
  assert.equal("valueText" in patch, false);
});

test("switching gift to journal resets person and gift value", () => {
  const gift = createState("gift", {
    personId: "person-1",
    valueText: "Prezent",
  });
  const journal = createState("journal");

  assert.equal(gift.personId, "person-1");
  assert.equal(journal.personId, "");
  assert.equal(journal.valueText, "");
});

test("closing and reopening creates fresh editor state", () => {
  const first = createState("note");
  first.contentText = "Unsaved draft";
  first.existingImages.push("user-1/draft.webp");

  const reopened = createState("note");
  assert.equal(reopened.contentText, "");
  assert.deepEqual(reopened.existingImages, []);
});

test("signed URLs are rejected from persistence", () => {
  assert.throws(() =>
    assertPersistableMemoryImageValues([
      "https://example.supabase.co/storage/v1/object/sign/memory-images/user-1/image.webp?token=secret",
    ])
  );
});

test("existing stored image values are preserved", () => {
  const storedValues = [
    "user-1/image.webp",
    "https://example.supabase.co/storage/v1/object/public/memory-images/user-1/legacy.webp",
  ];
  const state = createMemoryEditorInitialState({
    mode: "edit",
    type: "note",
    memory: { ...existingMemory, images: storedValues },
  });
  const patch = buildMemoryEditorUpdatePatch(state);

  assert.deepEqual(patch.images, storedValues);
  assert.notEqual(patch.images, storedValues);
});

test("edit mode does not allow a type change in its patch", () => {
  const state = createMemoryEditorInitialState({
    mode: "edit",
    type: "memory",
    memory: { ...existingMemory, type: "memory" },
  });
  const patch = buildMemoryEditorUpdatePatch(state);

  assert.equal(state.rawType, "memory");
  assert.equal("type" in patch, false);
});
