import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Notes projection uses Knowledge semantics instead of hiding all person-linked rows", async () => {
  const source = await readFile(new URL("../src/lib/repositories/knowledgeRepository.ts", import.meta.url), "utf8");
  assert.match(source, /isGlobalNotesKnowledgeItem\(mapLegacyMemoryToKnowledge\(row\)\)/);
  assert.doesNotMatch(source, /\.eq\("person_id", null\)/);
});

test("Person profile keeps confirmed source metadata and destructive operations owner-scoped", async () => {
  const [viewModels, profile, repository] = await Promise.all([
    readFile(new URL("../src/lib/people/buildPeopleViewModels.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/people/PersonProfileContent.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/repositories/knowledgeRepository.ts", import.meta.url), "utf8"),
  ]);
  assert.match(viewModels, /sourceKind: item\.evidence\.sourceKind/);
  assert.match(profile, /knowledgeSource\.confirmedByYou/);
  assert.match(profile, /permanentlyDeleteArchivedPersonKnowledge/);
  assert.match(repository, /\.eq\("person_id", authenticatedUserId|\.eq\("person_id", input\.personId\)/);
});
