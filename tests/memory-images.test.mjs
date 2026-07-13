import assert from "node:assert/strict";
import test from "node:test";

import {
  assertPersistableMemoryImageValues,
  extractMemoryImagePath,
  getOwnedMemoryImagePaths,
  prepareMemoryImagePathsForSigning,
  uploadMemoryImageFiles,
} from "../src/lib/storage/memoryImages.ts";

const PUBLIC_URL =
  "https://project.supabase.co/storage/v1/object/public/memory-images/user-id/photo.jpeg";
const SIGNED_URL =
  "https://project.supabase.co/storage/v1/object/sign/memory-images/user-id/photo.jpeg?token=secret";

test("existing object path is preserved", () => {
  assert.equal(extractMemoryImagePath("user-id/photo.jpeg"), "user-id/photo.jpeg");
});

test("legacy public URL produces the canonical path", () => {
  assert.equal(extractMemoryImagePath(PUBLIC_URL), "user-id/photo.jpeg");
});

test("signed URL produces the canonical path", () => {
  assert.equal(extractMemoryImagePath(SIGNED_URL), "user-id/photo.jpeg");
});

test("signed URL query parameters are removed", () => {
  const value = `${SIGNED_URL}&download=1`;
  assert.equal(extractMemoryImagePath(value), "user-id/photo.jpeg");
});

test("another bucket URL is rejected", () => {
  assert.equal(
    extractMemoryImagePath(
      "https://project.supabase.co/storage/v1/object/public/avatars/user-id/photo.jpeg"
    ),
    null
  );
});

test("path traversal is rejected", () => {
  assert.equal(extractMemoryImagePath("user-id/../photo.jpeg"), null);
  assert.equal(extractMemoryImagePath("user-id/%2E%2E/photo.jpeg"), null);
});

test("empty input returns null", () => {
  assert.equal(extractMemoryImagePath(""), null);
  assert.equal(extractMemoryImagePath("   "), null);
});

test("malformed input does not throw", () => {
  assert.doesNotThrow(() => extractMemoryImagePath("https://%"));
  assert.equal(extractMemoryImagePath("https://%"), null);
});

test("mixed legacy URLs and object paths preserve order", () => {
  const prepared = prepareMemoryImagePathsForSigning([
    PUBLIC_URL,
    "second-user/photo.webp",
  ]);

  assert.deepEqual(
    prepared.entries.map((entry) => entry.objectPath),
    ["user-id/photo.jpeg", "second-user/photo.webp"]
  );
});

test("duplicate object paths are deduplicated for signing", () => {
  const prepared = prepareMemoryImagePathsForSigning([
    PUBLIC_URL,
    "user-id/photo.jpeg",
    SIGNED_URL,
  ]);

  assert.deepEqual(prepared.uniqueObjectPaths, ["user-id/photo.jpeg"]);
  assert.equal(prepared.entries.length, 3);
});

test("signed display URLs cannot enter persistence payloads", () => {
  assert.throws(
    () => assertPersistableMemoryImageValues([SIGNED_URL]),
    /cannot be persisted/
  );

  assert.deepEqual(assertPersistableMemoryImageValues([PUBLIC_URL]), [PUBLIC_URL]);
});

test("upload returns a canonical object path and never a public URL", async () => {
  const uploadedPaths = [];
  const result = await uploadMemoryImageFiles(
    "user-id",
    [{ name: "photo.JPEG", size: 1024, type: "image/jpeg" }],
    async (objectPath) => {
      uploadedPaths.push(objectPath);
      return { error: null };
    }
  );
  const objectPath = result.objectPaths[0];

  assert.match(objectPath, /^user-id\/\d+-[a-z0-9]+\.jpeg$/);
  assert.deepEqual(uploadedPaths, [objectPath]);
  assert.deepEqual(result.errors, []);
  assert.equal(objectPath.includes("/storage/v1/object/public/"), false);
  assert.equal(objectPath.startsWith("http"), false);
});

test("foreign user path is rejected by ownership guard", () => {
  const result = getOwnedMemoryImagePaths(
    ["other-user/photo.jpeg"],
    "current-user"
  );

  assert.deepEqual(result.acceptedPaths, []);
  assert.equal(result.ignored[0]?.reason, "foreign_owner");
});

test("owner path is accepted by ownership guard", () => {
  const result = getOwnedMemoryImagePaths(
    ["current-user/photo.jpeg"],
    "current-user"
  );

  assert.deepEqual(result.acceptedPaths, ["current-user/photo.jpeg"]);
  assert.deepEqual(result.ignored, []);
});
