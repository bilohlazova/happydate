import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("avatar replacement persists before old-object cleanup and exposes removal", async () => {
  const source = await readFile(new URL("../src/hooks/useAvatarUpload.ts", import.meta.url), "utf8");
  assert.ok(source.indexOf("await onSuccess(filePath)") < source.indexOf("old avatar cleanup failed"));
  assert.match(source, /remove\(\[filePath\]\)/);
  const profile = await readFile(new URL("../src/app/(app)/profile/page.tsx", import.meta.url), "utf8");
  assert.match(profile, /aria-label="Remove avatar"/);
});

test("memory lifecycle reads prior images and protects referenced paths", async () => {
  const source = await readFile(new URL("../src/lib/repositories/memoryRepository.ts", import.meta.url), "utf8");
  assert.match(source, /listOwnedMemoryImageValues/);
  assert.match(source, /const referenced = new Set/);
  assert.match(source, /const removable = acceptedPaths\.filter/);
  assert.match(source, /Memory image cleanup failed/);
});
