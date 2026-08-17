import assert from "node:assert/strict";
import test from "node:test";
import { readBoundedJson } from "../src/lib/server/readBoundedJson.ts";

test("bounded JSON accepts a valid application/json request", async () => {
  const result = await readBoundedJson(new Request("https://happydate.test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: "person-1" }),
  }), 100);
  assert.deepEqual(result, { ok: true, value: { personId: "person-1" } });
});

test("bounded JSON rejects media type, malformed JSON and declared oversize", async () => {
  assert.equal((await readBoundedJson(new Request("https://happydate.test", {
    method: "POST", body: "{}",
  }), 100)).status, 415);
  assert.equal((await readBoundedJson(new Request("https://happydate.test", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{",
  }), 100)).status, 400);
  assert.equal((await readBoundedJson(new Request("https://happydate.test", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": "101" },
    body: "{}",
  }), 100)).status, 413);
});

test("bounded JSON stops a streamed body after the byte cap", async () => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('{"value":"'));
      controller.enqueue(encoder.encode("x".repeat(200)));
      controller.enqueue(encoder.encode('"}'));
      controller.close();
    },
  });
  const result = await readBoundedJson(new Request("https://happydate.test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: stream,
    duplex: "half",
  }), 64);
  assert.deepEqual(result, { ok: false, status: 413, error: "payload_too_large" });
});
