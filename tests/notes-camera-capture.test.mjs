import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("Notes camera uses the current Capacitor API and a browser fallback", async () => {
  const editor = await readFile(
    path.join(root, "src/components/notes/MemoryEditorSheet.tsx"),
    "utf8"
  );

  assert.match(editor, /Camera\.takePhoto\(\{/);
  assert.match(editor, /cameraDirection:\s*CameraDirection\.Rear/);
  assert.match(editor, /saveToGallery:\s*false/);
  assert.match(editor, /Capacitor\.isNativePlatform\(\)/);
  assert.match(editor, /capture="environment"/);
  assert.doesNotMatch(editor, /Camera\.getPhoto\(/);
});

test("Captured photos reuse private Notes image validation and persistence input", async () => {
  const editor = await readFile(
    path.join(root, "src/components/notes/MemoryEditorSheet.tsx"),
    "utf8"
  );

  assert.match(editor, /validateMemoryImageFile\(file\)/);
  assert.match(editor, /addPendingImages\(\[/);
  assert.match(editor, /newFiles:\s*pendingImages\.map/);
  assert.doesNotMatch(editor, /getPublicUrl|storage\.from/);
});

test("iOS camera disclosure covers private note photos", async () => {
  const plist = await readFile(path.join(root, "ios/App/App/Info.plist"), "utf8");
  assert.match(plist, /NSCameraUsageDescription/);
  assert.match(plist, /profile or private note/);
});
