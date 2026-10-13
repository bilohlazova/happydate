import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildOccasionGiftContext,
  buildOccasionGiftContextFromOccurrence,
  parseOccasionGiftContext,
} from "../src/lib/gifts/occasionGiftContext.ts";

const personA = "11111111-1111-4111-8111-111111111111";
const personB = "22222222-2222-4222-8222-222222222222";
const occurrence = {
  occasionKey: "pl_boys_day",
  occurrenceKey: "occasion:pl_boys_day:2026",
  countryCode: "PL",
  year: 2026,
};

test("canonical Occasion Gift context is stable and identity-based", () => {
  assert.equal(buildOccasionGiftContext({ occasionKey: "pl_boys_day", year: 2026, personId: personA }), `occasion:pl_boys_day:2026:${personA}`);
  assert.equal(buildOccasionGiftContext({ occasionKey: "pl_boys_day", year: 2026, personId: personA }), buildOccasionGiftContext({ occasionKey: "pl_boys_day", year: 2026, personId: personA }));
  assert.notEqual(buildOccasionGiftContext({ occasionKey: "pl_boys_day", year: 2027, personId: personA }), buildOccasionGiftContext({ occasionKey: "pl_boys_day", year: 2026, personId: personA }));
  assert.notEqual(buildOccasionGiftContext({ occasionKey: "pl_boys_day", year: 2026, personId: personB }), buildOccasionGiftContext({ occasionKey: "pl_boys_day", year: 2026, personId: personA }));
});

test("trusted occurrence builder validates registry, country, and canonical year", () => {
  assert.equal(buildOccasionGiftContextFromOccurrence(occurrence, personA), `occasion:pl_boys_day:2026:${personA}`);
  assert.throws(() => buildOccasionGiftContextFromOccurrence({ ...occurrence, occurrenceKey: "occasion:pl_boys_day:2027" }, personA));
  assert.throws(() => buildOccasionGiftContextFromOccurrence({ ...occurrence, countryCode: "DE" }, personA));
  assert.throws(() => buildOccasionGiftContext({ occasionKey: "invented_day", year: 2026, personId: personA }));
  assert.throws(() => buildOccasionGiftContext({ occasionKey: "pl_boys_day", year: 2099, personId: "not-a-person" }));
});

test("strict parser accepts only registry-backed canonical context", () => {
  const value = `occasion:pl_boys_day:2026:${personA}`;
  assert.deepEqual(parseOccasionGiftContext(value), { occasionKey: "pl_boys_day", year: 2026, personId: personA });
  assert.equal(parseOccasionGiftContext(`occasion:pl_boys_day:2027:${personA}`)?.year, 2027);
  assert.equal(parseOccasionGiftContext("occasion:invented_day:2026:" + personA), null);
  assert.equal(parseOccasionGiftContext("occasion:pl_boys_day:26:" + personA), null);
  assert.equal(parseOccasionGiftContext(`occasion:pl_boys_day:2026:${personA}:translated-name`), null);
});

test("canonical Gift persistence reuses event_context_key and exact owner/context reads", async () => {
  const persistence = await readFile(new URL("../src/lib/gifts/gift.persistence.ts", import.meta.url), "utf8");
  const service = await readFile(new URL("../src/lib/gifts/occasionGiftContext.server.ts", import.meta.url), "utf8");
  assert.match(persistence, /event_context_key:\s*identity\.eventContextKey/);
  assert.match(persistence, /listCanonicalGiftsForContextWithClient/);
  assert.match(persistence, /\.eq\("user_id", input\.userId\)[\s\S]*\.eq\("person_id", input\.personId\)[\s\S]*\.eq\("event_context_key", input\.contextKey\)/);
  assert.match(service, /getUserOccasionsForLocalDay/);
  assert.match(service, /resolveOwnedOccasionPeople/);
  assert.match(service, /buildOccasionGiftContextFromOccurrence/);
  assert.doesNotMatch(service, /insert\(|update\(|upsert\(/);
});

test("Occasion context does not introduce lifecycle or parallel gift concepts", async () => {
  const types = await readFile(new URL("../src/lib/gifts/gift.types.ts", import.meta.url), "utf8");
  const persistence = await readFile(new URL("../src/lib/gifts/gift.persistence.ts", import.meta.url), "utf8");
  assert.match(types, /\["idea", "selected", "purchased", "given"\]/);
  assert.doesNotMatch(types, /ready|prepared|shortlisted|occasion_selected/);
  assert.match(persistence, /createCanonicalGiftWithClient/);
  assert.doesNotMatch(persistence, /occasion_gifts|save_occasion_gift|create_occasion_gift/);
});
