import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  createMemoryAudioObjectPath,
  extractMemoryAudioPath,
  ownedMemoryAudioPath,
  validateMemoryAudioFile,
} from "../src/lib/storage/memoryAudio.ts";

test("memory audio accepts supported recorder formats within the size limit", () => {
  assert.equal(validateMemoryAudioFile({ size: 1024, type: "audio/webm;codecs=opus" }), null);
  assert.equal(validateMemoryAudioFile({ size: 1024, type: "audio/mp4" }), null);
  assert.equal(validateMemoryAudioFile({ size: 26 * 1024 * 1024, type: "audio/mp4" }), "audio_too_large");
  assert.equal(validateMemoryAudioFile({ size: 1024, type: "video/mp4" }), "unsupported_audio");
});

test("audio paths are canonical and owner scoped", () => {
  const path = createMemoryAudioObjectPath("user-1", "audio/mp4", 123, 0.5);
  assert.match(path, /^user-1\/123-[a-z0-9]+\.m4a$/);
  assert.equal(extractMemoryAudioPath(path), path);
  assert.equal(ownedMemoryAudioPath(path, "user-1"), path);
  assert.equal(ownedMemoryAudioPath(path, "user-2"), null);
  assert.equal(extractMemoryAudioPath("../foreign/audio.webm"), null);
});

test("voice Notes use MediaRecorder, private signed URLs and lifecycle cleanup", async () => {
  const [editor, page, repository, migration, androidManifest, iosInfo] = await Promise.all([
    readFile(new URL("../src/components/notes/MemoryEditorSheet.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/notes/NotesPageContent.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/repositories/memoryRepository.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20260806191632_harden_memory_audio_bucket.sql", import.meta.url), "utf8"),
    readFile(new URL("../android/app/src/main/AndroidManifest.xml", import.meta.url), "utf8"),
    readFile(new URL("../ios/App/App/Info.plist", import.meta.url), "utf8"),
  ]);
  assert.match(editor, /navigator\.mediaDevices\.getUserMedia/);
  assert.match(editor, /MAX_MEMORY_AUDIO_DURATION_SECONDS/);
  assert.match(editor, /hd-audio-wave/);
  assert.match(page, /uploadMemoryAudio/);
  assert.match(page, /deleteMemoryAudioObject/);
  assert.match(repository, /createMemoryAudioSignedUrl/);
  assert.match(repository, /\.from\(MEMORY_AUDIO_BUCKET\)/);
  assert.match(migration, /26214400/);
  assert.match(migration, /allowed_mime_types/);
  assert.match(androidManifest, /android\.permission\.RECORD_AUDIO/);
  assert.match(iosInfo, /NSMicrophoneUsageDescription/);
});
