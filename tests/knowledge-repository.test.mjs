import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const repositoryPath = new URL(
  "../src/lib/repositories/knowledgeRepository.ts",
  import.meta.url
);
const legacyRepositoryPath = new URL(
  "../src/lib/repositories/memoryRepository.ts",
  import.meta.url
);

test("canonical Knowledge Repository exposes the staged API", async () => {
  const source = await readFile(repositoryPath, "utf8");

  for (const method of [
    "listKnowledge",
    "getKnowledgeForPerson",
    "getKnowledgeContext",
    "createKnowledge",
    "updateKnowledge",
    "archiveKnowledge",
    "deleteKnowledge",
  ]) {
    assert.match(source, new RegExp(`export async function ${method}\\b`));
  }
});

test("canonical Repository has no upper-layer dependencies", async () => {
  const source = await readFile(repositoryPath, "utf8");

  for (const forbidden of [
    "/brain/",
    "/assistant/",
    "/components/",
    "/app/",
    "/home/",
    "/people/",
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});

test("Memory compatibility adapter delegates projection and CRUD without raw readers", async () => {
  const source = await readFile(legacyRepositoryPath, "utf8");

  assert.equal(source.includes("@/lib/brain/"), false);
  assert.match(source, /listNotesKnowledgeProjection/);
  assert.doesNotMatch(source, /getActiveMemories|getMemoriesForPerson|getBrainMemories/);
});

test("canonical reads use explicit columns instead of select star", async () => {
  const source = await readFile(repositoryPath, "utf8");

  assert.equal(/\.select\(["']\*["']\)/.test(source), false);
  assert.match(source, /MEMORY_ROW_COLUMNS/);
});
