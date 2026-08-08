import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("AI recommendation can be persisted for the active Person and Event", async () => {
  const [page, loaders] = await Promise.all([
    source("src/app/gift/start/StartPageContent.tsx"),
    source("src/lib/gifts/gift.loaders.ts"),
  ]);
  assert.match(page, /createPersonGiftIdea\(personId, title, form\.eventId\)/);
  assert.match(loaders, /eventId: eventId \?\? null/);
  assert.match(page, /recommendations\.saveForPerson/);
});

test("recommendation save is guarded against repeated clicks and reports result", async () => {
  const page = await source("src/app/gift/start/StartPageContent.tsx");
  assert.match(page, /if \(savingSuggestionKey \|\| savedSuggestionKeys\.includes\(key\)\) return/);
  assert.match(page, /disabled=\{isSaved \|\| savingSuggestionKey !== null\}/);
  assert.match(page, /suggestionSaveErrorKey === suggestionKey/);
  assert.match(page, /workspace\?\.activeIdeas\.some/);
});

test("recommendation save copy has exact locale parity", async () => {
  const locales = ["pl", "uk", "en", "ru", "de"];
  const required = ["saveForPerson", "saving", "saved", "saveError"];
  for (const locale of locales) {
    const messages = JSON.parse(await source(`messages/${locale}/gift.json`));
    for (const key of required) {
      assert.equal(typeof messages.recommendations[key], "string", `${locale}.${key}`);
      assert.notEqual(messages.recommendations[key].trim(), "", `${locale}.${key}`);
    }
  }
});

test("AI contract does not fabricate unverified product links", async () => {
  const types = await source("src/lib/gift-intelligence/giftIntelligence.types.ts");
  const suggestion = types.slice(
    types.indexOf("export interface GiftRecommendationSuggestion"),
    types.indexOf("export interface GiftRecommendationAiResponse"),
  );
  assert.doesNotMatch(suggestion, /url|href|merchant/i);
});
