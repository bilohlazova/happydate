import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("people hub presents a care circle without fake hidden actions", async () => {
  const header = await readFile(new URL("../src/components/people/PeopleHeader.tsx", import.meta.url), "utf8");
  const card = await readFile(new URL("../src/components/people/PersonCard.tsx", import.meta.url), "utf8");

  assert.match(header, /page\.eyebrow/);
  assert.match(card, /people-person-card__accent/);
  assert.doesNotMatch(card, /group-hover:-translate-x-10/);
  assert.doesNotMatch(card, /aria-label=\{t\("card\.(addMemory|giftIdea|contact)"\)\}/);
});
