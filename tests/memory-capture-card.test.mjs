import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createTranslator } from "next-intl";

import {
  MEMORY_CAPTURE_CANDIDATE_TYPES,
} from "../src/lib/memory-capture/index.ts";

const root = process.cwd();
const locales = ["pl", "uk", "en", "ru", "de"];

async function memoryCaptureMessages(locale) {
  return JSON.parse(
    await readFile(path.join(root, "messages", locale, "memoryCapture.json"), "utf8"),
  );
}

test("MemoryCaptureCard translations cover every candidate type in every locale", async () => {
  for (const locale of locales) {
    const messages = await memoryCaptureMessages(locale);
    const t = createTranslator({ locale, messages: { memoryCapture: messages } });

    assert.ok(t("memoryCapture.title").trim());
    assert.ok(t("memoryCapture.save").trim());
    assert.ok(t("memoryCapture.notNow").trim());
    assert.ok(t("memoryCapture.highConfidence").trim());
    assert.ok(t("memoryCapture.retry").trim());
    assert.ok(t("memoryCapture.status.saved").trim());
    assert.ok(t("memoryCapture.status.alreadySaved").trim());
    assert.ok(t("memoryCapture.status.saveFailed").trim());

    for (const type of MEMORY_CAPTURE_CANDIDATE_TYPES) {
      const label = t(`memoryCapture.labels.${type}`);
      const aria = t(`memoryCapture.aria.candidate.${type}`, { value: "motorcycles" });
      assert.ok(label.trim(), `${locale}:${type}`);
      assert.notEqual(label, type);
      assert.match(aria, /motorcycles/);
    }
  }
});

test("MemoryCaptureCard supports all canonical candidate types with icons and label keys", async () => {
  const source = await readFile(
    path.join(root, "src/components/memory/MemoryCaptureCard.tsx"),
    "utf8",
  );

  for (const type of MEMORY_CAPTURE_CANDIDATE_TYPES) {
    assert.match(source, new RegExp(`${type}:`), `icon mapping for ${type}`);
  }
  assert.match(source, /memoryCaptureLabelKey\(candidate\.type\)/);
  assert.match(source, /memoryCaptureAriaLabelKey\(candidate\.type\)/);
});

test("MemoryCaptureCard exposes the approved presentation-only component API", async () => {
  const source = await readFile(
    path.join(root, "src/components/memory/MemoryCaptureCard.tsx"),
    "utf8",
  );

  assert.match(source, /candidate: MemoryCaptureCandidate/);
  assert.match(source, /onConfirm: \(candidateId: string\) => void/);
  assert.match(source, /onDismiss: \(candidateId: string\) => void/);
  assert.match(source, /loading\?: boolean/);
  assert.doesNotMatch(source, /fetch\(/);
  assert.doesNotMatch(source, /supabase|from\(|KnowledgeRepository|createClient/);
});

test("MemoryCaptureCard hides immediately and calls confirm or dismiss callbacks", async () => {
  const source = await readFile(
    path.join(root, "src/components/memory/MemoryCaptureCard.tsx"),
    "utf8",
  );

  assert.match(source, /const \[hidden, setHidden\] = useState\(false\)/);
  assert.match(source, /setHidden\(true\);\s+onConfirm\(candidate\.id\)/);
  assert.match(source, /setHidden\(true\);\s+onDismiss\(candidate\.id\)/);
  assert.match(source, /if \(hidden\) return null/);
});

test("MemoryCaptureCard has accessible controls and loading state", async () => {
  const source = await readFile(
    path.join(root, "src/components/memory/MemoryCaptureCard.tsx"),
    "utf8",
  );

  assert.match(source, /aria-labelledby=\{titleId\}/);
  assert.match(source, /aria-label=\{t\("aria\.card"\)\}/);
  assert.match(source, /aria-label=\{t\("aria\.save"/);
  assert.match(source, /aria-label=\{t\("aria\.notNow"/);
  assert.match(source, /disabled=\{loading\}/);
  assert.match(source, /Loader2/);
  assert.match(source, /t\("saving"\)/);
});

test("MemoryCaptureCard keeps compact mobile-friendly HappyDate styling", async () => {
  const source = await readFile(
    path.join(root, "src/components/memory/MemoryCaptureCard.tsx"),
    "utf8",
  );

  assert.match(source, /MobileUI\.card/);
  assert.match(source, /backdrop-blur/);
  assert.match(source, /rounded-2xl/);
  assert.match(source, /sm:flex-row/);
  assert.doesNotMatch(source, /overflow-x/);
  assert.doesNotMatch(source, /fixed|absolute/);
});
