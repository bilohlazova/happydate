import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Notes event associations cross only canonical repository boundaries", async () => {
  const [notesPage, memoryRepository, knowledgeRepository] = await Promise.all([
    readFile(new URL("../src/app/notes/NotesPageContent.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/repositories/memoryRepository.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/repositories/knowledgeRepository.ts", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(notesPage, /\.from\("memories"\)/);
  assert.match(memoryRepository, /listCalendarEvents\(userId\)/);
  assert.match(memoryRepository, /eventId: input\.eventId \?\? null/);
  assert.match(knowledgeRepository, /event_id: row\.event_id/);
  assert.match(knowledgeRepository, /updateKnowledge[\s\S]*\.eq\("user_id", userId\)/);
  assert.match(knowledgeRepository, /deleteKnowledge[\s\S]*\.eq\("user_id", userId\)/);
});
