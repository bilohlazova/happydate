import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("Notes deletion has one canonical owner and verifies the deleted row", async () => {
  const [page, memory, knowledge, card] = await Promise.all([
    read("src/app/notes/NotesPageContent.tsx"),
    read("src/lib/repositories/memoryRepository.ts"),
    read("src/lib/repositories/knowledgeRepository.ts"),
    read("src/components/notes/NoteMemoryCard.tsx"),
  ]);

  assert.match(knowledge, /\.delete\(\)[\s\S]*\.select\("id"\)[\s\S]*data\.length !== 1/);
  assert.match(memory, /export interface DeleteMemoryResult/);
  assert.match(memory, /cleanupErrors\.push/);
  assert.doesNotMatch(page, /deleteMemoryRecord\(memory\.id\);[\s\S]{0,260}deleteMemoryImageObjects\(memory\.images\)/);
  assert.doesNotMatch(page, /deleteMemoryRecord\(memory\.id\);[\s\S]{0,320}deleteMemoryAudioObject\(memory\.audio_url\)/);
  assert.match(page, /if \(deletingId\) return/);
  assert.match(page, /states\.deleteCleanupFailed/);
  assert.match(page, /states\.deleteRefreshFailed/);
  assert.match(card, /is-menu-open/);
});

test("Notes load errors are not converted into a fake empty list", async () => {
  const source = await read("src/lib/repositories/memoryRepository.ts");
  assert.doesNotMatch(source, /listNotesKnowledgeProjection\(\{ userId \}\)[\s\S]*catch \{[\s\S]*return \[\]/);
});
