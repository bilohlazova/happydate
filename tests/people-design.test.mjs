import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("People hub uses a shared hierarchy, accessible loading state and person-first cards", async () => {
  const page = await readFile(new URL("../src/components/people/PeoplePageContent.tsx", import.meta.url), "utf8");
  const header = await readFile(new URL("../src/components/people/PeopleHeader.tsx", import.meta.url), "utf8");
  const card = await readFile(new URL("../src/components/people/PersonCard.tsx", import.meta.url), "utf8");
  assert.match(page, /className={`people-page/);
  assert.match(page, /<PeopleLoadingState label=/);
  assert.match(header, /<header className="people-page-header/);
  assert.match(card, /people-person-card__content/);
});
