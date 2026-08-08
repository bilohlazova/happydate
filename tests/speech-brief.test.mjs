import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeSpeechText,
  selectSpeechVoice,
  splitSpeechText,
} from "../src/lib/speech/speechText.ts";

test("speech text removes SSML-sensitive and control characters", () => {
  assert.equal(
    normalizeSpeechText("  День <народження> & Діма\u0000\nсьогодні  "),
    "День народження Діма сьогодні",
  );
});

test("speech text splits long briefings without losing words", () => {
  const input = "Перше коротке речення. Друге речення містить важливу інформацію про подію. Третє речення завершує брифінг.";
  const chunks = splitSpeechText(input, 55);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.length <= 55));
  assert.equal(chunks.join(" ").replace(/\s+/g, " "), input);
});

test("voice selection prefers exact locale and then language family", () => {
  const voices = [
    { lang: "en-US", name: "English" },
    { lang: "uk-UA", name: "Ukrainian" },
    { lang: "pl-PL", name: "Polish" },
  ];
  assert.equal(selectSpeechVoice(voices, "uk-UA")?.name, "Ukrainian");
  assert.equal(selectSpeechVoice(voices, "pl-UA")?.name, "Polish");
  assert.equal(selectSpeechVoice(voices, "de-DE"), null);
});
