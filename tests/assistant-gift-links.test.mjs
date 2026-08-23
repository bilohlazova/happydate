import assert from "node:assert/strict";
import test from "node:test";
import {
  extractAssistantGiftLinks,
  giftLinkHost,
} from "../src/lib/gifts/assistantGiftLinks.ts";
import { normalizeGiftHttpsUrl } from "../src/lib/gifts/giftLinkUrl.ts";

test("assistant gift link extraction accepts only bounded unique HTTPS links", () => {
  assert.deepEqual(
    extractAssistantGiftLinks("Try https://example.com/gift, then https://example.com/gift and http://unsafe.test."),
    ["https://example.com/gift"],
  );
  assert.equal(
    extractAssistantGiftLinks("https://a.test https://b.test https://c.test https://d.test").length,
    3,
  );
});

test("assistant gift link extraction ignores malformed and oversized values", () => {
  assert.deepEqual(extractAssistantGiftLinks("https://% and https://"), []);
  assert.deepEqual(extractAssistantGiftLinks(`https://example.test/${"a".repeat(2_100)}`), []);
  assert.equal(giftLinkHost("https://www.example.com/gift"), "example.com");
});

test("gift link normalization gives duplicate checks one canonical HTTPS value", () => {
  assert.equal(normalizeGiftHttpsUrl(" https://example.com "), "https://example.com/");
  assert.equal(normalizeGiftHttpsUrl("http://example.com"), null);
  assert.equal(normalizeGiftHttpsUrl("https://%"), null);
});
