import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(target);
    return /\.(ts|tsx)$/.test(entry.name) ? [target] : [];
  }));
  return files.flat();
}

test("Knowledge Repository remains the only runtime memories persistence owner", async () => {
  const srcRoot = new URL("../src/", import.meta.url).pathname;
  const files = await sourceFiles(srcRoot);
  const owners = [];

  for (const file of files) {
    const source = await readFile(file, "utf8");
    if (/\.from\(["']memories["']\)/.test(source)) owners.push(file);
  }

  assert.deepEqual(
    owners.map((file) => path.relative(new URL("../", import.meta.url).pathname, file)),
    ["src/lib/repositories/knowledgeRepository.ts"],
  );
});

test("retired compatibility modules and public Memory Capture routes stay absent", async () => {
  const retired = [
    "src/lib/brain/mappers/mapMemory.ts",
    "src/lib/memoryCaptureClient.ts",
    "src/app/api/memory-capture/detect-v2/route.ts",
    "src/app/api/memory-capture/confirm-v2/route.ts",
  ];
  const files = new Set(
    (await sourceFiles(new URL("../src/", import.meta.url).pathname))
      .map((file) => path.relative(new URL("../", import.meta.url).pathname, file)),
  );
  for (const retiredPath of retired) assert.equal(files.has(retiredPath), false, retiredPath);
});

test("architecture handoff records completed roadmap and retained adapters", async () => {
  const [architecture, handoff] = await Promise.all([
    readFile(new URL("../docs/knowledge-system-architecture.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/stage-9-cleanup-and-handoff.md", import.meta.url), "utf8"),
  ]);
  assert.match(architecture, /9\. ✅ Cleanup and documentation finalization/);
  assert.match(handoff, /Status: Complete/);
  assert.match(handoff, /Intentionally retained compatibility/);
});
