import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

import { MEMORY_CAPTURE_ENDPOINTS } from "../src/lib/memory-capture/memoryCaptureEndpoints.ts";

test("Memory Capture exposes only the canonical signed-token API", () => {
  assert.deepEqual(MEMORY_CAPTURE_ENDPOINTS, {
    canonical: {
      detect: "/api/memory-capture/detect",
      confirm: "/api/memory-capture/confirm",
    },
  });
  assert.ok(Object.isFrozen(MEMORY_CAPTURE_ENDPOINTS));
  assert.ok(Object.isFrozen(MEMORY_CAPTURE_ENDPOINTS.canonical));
});

test("canonical client owns both endpoints without hardcoded route strings", async () => {
  const client = await readFile(new URL("../src/lib/happy-learning/happyLearningClient.ts", import.meta.url), "utf8");
  assert.match(client, /MEMORY_CAPTURE_ENDPOINTS\.canonical\.detect/);
  assert.match(client, /MEMORY_CAPTURE_ENDPOINTS\.canonical\.confirm/);
  assert.doesNotMatch(client, /fetcher\("\/api\/memory-capture/);
});

test("versioned routes, legacy client and legacy presentation component are removed", async () => {
  const removed = [
    "../src/app/api/memory-capture/detect-v2/route.ts",
    "../src/app/api/memory-capture/confirm-v2/route.ts",
    "../src/lib/memoryCaptureClient.ts",
    "../src/components/memory/MemoryCaptureCard.tsx",
  ];
  for (const path of removed) {
    await assert.rejects(access(new URL(path, import.meta.url)));
  }
});

test("canonical confirmation keeps token, ownership and conflict checks", async () => {
  const confirm = await readFile(new URL("../src/lib/happy-learning/happyLearningConfirmV2.server.ts", import.meta.url), "utf8");
  assert.match(confirm, /verifyHappyLearningDetectionToken/);
  assert.match(confirm, /verified\.claims\.userId !== auth\.userId/);
  assert.match(confirm, /findOwnedPerson/);
  assert.match(confirm, /semantic\.status === "conflict"/);
});
