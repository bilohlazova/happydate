import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCreateNotesMemoryPayload,
  buildUpdateNotesMemoryPayload,
  getNotesTypeDisplayConfig,
} from "../src/lib/memories/notesMemoryTypes.ts";

const createInput = {
  userId: "user-id",
  contentText: "Treść",
  personId: null,
  images: null,
};

test("create without type writes note", () => {
  assert.equal(buildCreateNotesMemoryPayload(createInput).type, "note");
});

test("create with memory writes memory", () => {
  assert.equal(
    buildCreateNotesMemoryPayload({ ...createInput, type: "memory" }).type,
    "memory"
  );
});

test("create with gift writes gift", () => {
  assert.equal(
    buildCreateNotesMemoryPayload({ ...createInput, type: "gift" }).type,
    "gift"
  );
});

test("create with journal writes journal", () => {
  assert.equal(
    buildCreateNotesMemoryPayload({ ...createInput, type: "journal" }).type,
    "journal"
  );
});

test("update without type omits type from payload", () => {
  const payload = buildUpdateNotesMemoryPayload({
    contentText: "Zmieniona treść",
    personId: null,
    images: null,
  });

  assert.equal("type" in payload, false);
});

test("update ignores an attempted type change", () => {
  const payload = buildUpdateNotesMemoryPayload({
    contentText: "Zmieniona treść",
    personId: null,
    images: null,
    type: "memory",
  });

  assert.equal("type" in payload, false);
});

test("editing text does not rewrite an existing restaurant type", () => {
  const existingRawType = "restaurant";
  const payload = buildUpdateNotesMemoryPayload({
    contentText: "Zmieniona treść",
    personId: "person-id",
    images: ["user-id/photo.webp"],
  });

  assert.equal(existingRawType, "restaurant");
  assert.equal("type" in payload, false);
});

test("card config returns safe fallback for unknown raw type", () => {
  const config = getNotesTypeDisplayConfig("restaurant");

  assert.equal(config.type, "other");
  assert.equal(config.cardLabel, "Inny zapis");
});

test("selected bottom-sheet type survives into create payload", () => {
  const selectedType = "gift";
  const payload = buildCreateNotesMemoryPayload({
    ...createInput,
    type: selectedType,
  });

  assert.equal(payload.type, selectedType);
});
