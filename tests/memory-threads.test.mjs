import assert from "node:assert/strict";
import test from "node:test";

import { buildMemoryThreads } from "../src/lib/memories/memoryThreads.ts";

function memory(id, overrides = {}) {
  return {
    id, content_text: null, created_at: "2026-08-01T00:00:00.000Z", person_id: null,
    event_id: null, audio_url: null, transcript_text: null, images: null, ai_tags: null,
    ai_summary: null, type: "note", title: null, value_text: null, occurred_on: null,
    ...overrides,
  };
}

test("threads require at least two explicit source records", () => {
  const threads = buildMemoryThreads([
    memory("1", { person_id: "anna", ai_tags: ["Подорожі"] }),
    memory("2", { person_id: "anna", ai_tags: ["подорожі"] }),
    memory("3", { person_id: "maria", ai_tags: ["Книги"] }),
  ], [{ id: "anna", name: "Anna", relation: null }, { id: "maria", name: "Maria", relation: null }]);

  assert.deepEqual(threads.map((thread) => thread.id), ["person:anna", "topic:подорожі"]);
  assert.deepEqual(threads[0].sourceIds, ["1", "2"]);
});

test("gift thread uses canonical stored type and stable ordering", () => {
  const threads = buildMemoryThreads([
    memory("1", { type: "gift" }), memory("2", { type: "GIFT" }), memory("3", { type: "note" }),
  ], []);
  assert.deepEqual(threads, [{ id: "gift:ideas", kind: "gift", sourceIds: ["1", "2"] }]);
});
