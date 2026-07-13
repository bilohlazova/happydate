import assert from "node:assert/strict";
import test from "node:test";

import {
  formatNotesCardDate,
  getNotesCardPresentation,
} from "../src/lib/memories/notesMemoryTypes.ts";

const fixedNow = new Date(2026, 6, 13, 12, 0, 0);

function presentation(overrides = {}) {
  return getNotesCardPresentation({
    normalizedType: "note",
    title: null,
    valueText: null,
    contentText: "Treść zapisu",
    occurredOn: null,
    createdAt: "2026-07-13T10:00:00+02:00",
    personName: null,
    imageCount: 0,
    ...overrides,
  });
}

test("note title uses an explicit title", () => {
  assert.equal(presentation({ title: "Plan rozmowy" }).title, "Plan rozmowy");
});

test("note title falls back to the linked person", () => {
  const result = presentation({ personName: "Kasia Nowak" });
  assert.equal(result.title, "Kasia Nowak");
  assert.equal(result.titleUsesPerson, true);
});

test("note title falls back to Notatka", () => {
  const result = presentation();
  assert.equal(result.title, "Notatka");
  assert.equal(result.showTitle, false);
});

test("memory title has priority over linked person", () => {
  const result = presentation({
    normalizedType: "memory",
    title: "Weekend w Gdańsku",
    personName: "Olek",
  });
  assert.equal(result.title, "Weekend w Gdańsku");
  assert.equal(result.titleUsesPerson, false);
});

test("gift title prefers the linked person name", () => {
  const result = presentation({
    normalizedType: "gift",
    title: "Pomysły urodzinowe",
    personName: "Olek",
  });
  assert.equal(result.title, "Olek");
  assert.equal(result.titleUsesPerson, true);
});

test("journal never exposes a linked person", () => {
  const result = presentation({
    normalizedType: "journal",
    personName: "Kasia",
  });
  assert.equal(result.title, "Mój dzień");
  assert.equal(result.visiblePersonName, null);
  assert.equal(result.metaParts.some((part) => part.includes("Kasia")), false);
});

test("unknown type uses the Inny zapis presentation", () => {
  const result = presentation({ normalizedType: "restaurant" });
  assert.equal(result.displayType, "other");
  assert.equal(result.typeLabel, "Inny zapis");
  assert.equal(result.title, "Inny zapis");
});

test("value_text has priority for structured legacy presentation", () => {
  const result = presentation({
    normalizedType: "coffee",
    valueText: "Flat white",
    contentText: "Lubi kawę",
  });
  assert.equal(result.content, "Flat white");
});

test("gift presentation shows the saved value_text idea", () => {
  const result = presentation({
    normalizedType: "gift",
    valueText: "Książka o fotografii",
    contentText: "Opcjonalne wyjaśnienie",
  });
  assert.equal(result.content, "Książka o fotografii");
});

test("empty content fallback differs by displayed type", () => {
  const expected = {
    note: "Brak treści notatki",
    memory: "Brak opisu wspomnienia",
    gift: "Brak opisu pomysłu",
    journal: "Brak treści wpisu",
    restaurant: "Brak treści",
  };

  for (const [normalizedType, fallback] of Object.entries(expected)) {
    const result = presentation({
      normalizedType,
      contentText: "   ",
      valueText: "",
    });
    assert.equal(result.content, fallback);
    assert.equal(result.contentIsFallback, true);
  }
});

test("date uses occurred_on before created_at and formats same-year dates", () => {
  assert.equal(
    formatNotesCardDate("2026-05-17", "2026-07-13T10:00:00+02:00", fixedNow),
    "17 maja"
  );
});

test("today uses Dzisiaj", () => {
  assert.equal(formatNotesCardDate("2026-07-13", "2025-01-01", fixedNow), "Dzisiaj");
});

test("yesterday and recent dates use natural labels", () => {
  assert.equal(formatNotesCardDate("2026-07-12", "2025-01-01", fixedNow), "Wczoraj");
  assert.equal(formatNotesCardDate("2026-07-10", "2025-01-01", fixedNow), "3 dni temu");
});

test("previous-year dates include the year", () => {
  assert.equal(
    formatNotesCardDate("2025-05-17", "2026-07-13T10:00:00+02:00", fixedNow),
    "17 maja 2025"
  );
});

test("multiple images produce correct count metadata", () => {
  const result = presentation({ imageCount: 3 });
  assert.equal(result.imageCountLabel, "3 zdjęcia");
  assert.equal(result.metaParts.includes("3 zdjęcia"), true);
});

test("unknown legacy raw type is preserved outside and not exposed by UI presentation", () => {
  const rawType = "restaurant";
  const result = presentation({ normalizedType: rawType, personName: "Kasia" });

  assert.equal(rawType, "restaurant");
  assert.equal(result.typeLabel, "Inny zapis");
  assert.equal(JSON.stringify(result).includes("restaurant"), false);
});
