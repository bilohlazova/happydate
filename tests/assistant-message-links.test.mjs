import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  MAX_MESSAGE_LINKS,
  parseMessageLinks,
  shortUrlLabel,
  toSafeHttpUrl,
} from "../src/lib/assistant/messageLinks.ts";

const links = (segments) => segments.filter((s) => s.type === "link");
const plain = (segments) => segments.filter((s) => s.type === "text").map((s) => s.text).join("");

test("bare http/https URLs become links with a short readable label", () => {
  const [a, b] = links(
    parseMessageLinks("Дивись https://rozetka.com.ua/ua/some-product-name/p123456789/ та http://example.com/x"),
  );
  assert.equal(a.href, "https://rozetka.com.ua/ua/some-product-name/p123456789/");
  assert.ok(a.label.startsWith("rozetka.com.ua/ua/some-product"));
  assert.ok(a.label.length <= 48);
  assert.equal(b.href, "http://example.com/x");
  assert.equal(b.label, "example.com/x");
});

test("trailing punctuation and unbalanced brackets stay outside the link", () => {
  const segments = parseMessageLinks("Ось (https://a.test/x), або https://b.test/y. Ще: https://c.test/z!");
  assert.deepEqual(links(segments).map((l) => l.href), ["https://a.test/x", "https://b.test/y", "https://c.test/z"]);
  assert.equal(plain(segments), "Ось (), або . Ще: !");
  const wiki = links(parseMessageLinks("https://en.wikipedia.org/wiki/Foo_(bar)"));
  assert.equal(wiki[0].href, "https://en.wikipedia.org/wiki/Foo_(bar)");
});

test("markdown links show the descriptive label instead of the URL", () => {
  const segments = parseMessageLinks("Купи [Набір LEGO Classic](https://rozetka.com.ua/ua/lego/p1/) сьогодні");
  assert.deepEqual(segments, [
    { type: "text", text: "Купи " },
    { type: "link", href: "https://rozetka.com.ua/ua/lego/p1/", label: "Набір LEGO Classic" },
    { type: "text", text: " сьогодні" },
  ]);
});

test("a markdown label that is itself a long URL is shortened", () => {
  const long = `https://shop.example/${"a".repeat(200)}`;
  const [link] = links(parseMessageLinks(`[${long}](${long})`));
  assert.ok(link.label.length <= 48);
  assert.equal(link.href, long);
});

test("several links in one message, mixed markdown and bare, keep order and line breaks", () => {
  const text = "1. [Книга](https://a.test/book)\n2. https://b.test/toy\n3. [Квіти](https://c.test/flowers)";
  const segments = parseMessageLinks(text);
  assert.deepEqual(links(segments).map((l) => l.href), ["https://a.test/book", "https://b.test/toy", "https://c.test/flowers"]);
  assert.equal(plain(segments), "1. \n2. \n3. ");
  assert.equal(segments.length, 6);
});

test("text without links and empty input round-trip unchanged", () => {
  assert.deepEqual(parseMessageLinks("Привіт!\n\n  Як справи?"), [{ type: "text", text: "Привіт!\n\n  Як справи?" }]);
  assert.deepEqual(parseMessageLinks(""), []);
});

test("dangerous schemes in markdown links are never turned into links", () => {
  const bad = [
    "javascript:alert(1)",
    "JaVaScRiPt:alert(document.cookie)",
    "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
    "file:///etc/passwd",
    "vbscript:msgbox(1)",
    "ftp://example.com/x",
    "blob:https://example.com/uuid",
    "//evil.test/x",
    "/relative/path",
    "mailto:a@b.c",
    "tel:+380501234567",
    "intent://scan/#Intent;scheme=zxing;end",
  ];
  for (const target of bad) {
    const text = `[Клікни](${target})`;
    const segments = parseMessageLinks(text);
    assert.deepEqual(links(segments), [], target);
    assert.equal(plain(segments), text, target);
  }
});

test("dangerous schemes written as bare text are not linkified", () => {
  for (const text of ["javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "file:///etc/passwd", "www.example.com"]) {
    assert.deepEqual(links(parseMessageLinks(text)), [], text);
  }
});

test("whitespace/control-character obfuscation of schemes is rejected", () => {
  for (const target of ["java\tscript:alert(1)", "java%0Ascript:alert(1)", " javascript:alert(1)", "\u0001javascript:alert(1)"]) {
    assert.equal(toSafeHttpUrl(target), null, JSON.stringify(target));
  }
  assert.deepEqual(links(parseMessageLinks("[x](java\nscript:alert(1))")), []);
});

test("URLs with embedded credentials or empty hosts are rejected", () => {
  assert.equal(toSafeHttpUrl("https://rozetka.com.ua@evil.test/login"), null);
  assert.equal(toSafeHttpUrl("https://user:pass@example.com"), null);
  assert.equal(toSafeHttpUrl("https://"), null);
  assert.equal(toSafeHttpUrl("https://%"), null);
  assert.equal(toSafeHttpUrl(`https://example.com/${"a".repeat(2_100)}`), null);
  assert.deepEqual(links(parseMessageLinks("https://rozetka.com.ua@evil.test/login")), []);
});

test("HTML from the model is kept as inert text, not parsed", () => {
  const html = '<img src=x onerror=alert(1)> <a href="javascript:alert(1)">x</a> <script>alert(1)</script>';
  const segments = parseMessageLinks(html);
  assert.deepEqual(links(segments), []);
  assert.equal(plain(segments), html);
  const mixed = parseMessageLinks('<a href="https://a.test/ok">go</a>');
  assert.equal(links(mixed).length, 1);
  assert.ok(!plain(mixed).includes("https://a.test/ok"));
});

test("link count is capped and extra URLs stay as text", () => {
  const text = Array.from({ length: MAX_MESSAGE_LINKS + 5 }, (_, i) => `https://a.test/${i}`).join(" ");
  const segments = parseMessageLinks(text);
  assert.equal(links(segments).length, MAX_MESSAGE_LINKS);
  assert.ok(plain(segments).includes(`https://a.test/${MAX_MESSAGE_LINKS + 4}`));
});

test("pathological input is handled quickly", () => {
  const started = Date.now();
  parseMessageLinks("[".repeat(50_000));
  parseMessageLinks(`[${"a".repeat(150)}](${"(".repeat(20_000)}`);
  parseMessageLinks(`https://a.test/${"(".repeat(20_000)}`);
  assert.ok(Date.now() - started < 2_000);
});

test("short labels keep the host even for very long hosts", () => {
  const label = shortUrlLabel(new URL(`https://${"sub.".repeat(20)}example.com/path`));
  assert.ok(label.startsWith("sub.sub."));
});

test("chat renders assistant links through the safe LinkifiedText component", async () => {
  const conversation = await readFile(new URL("../src/components/chat-assistant/ConversationView.tsx", import.meta.url), "utf8");
  const linkified = await readFile(new URL("../src/components/chat-assistant/LinkifiedText.tsx", import.meta.url), "utf8");
  const parser = await readFile(new URL("../src/lib/assistant/messageLinks.ts", import.meta.url), "utf8");
  assert.match(conversation, /<LinkifiedText text=\{message\.content\} \/>/);
  assert.match(conversation, /message\.role === "assistant"/);
  assert.match(linkified, /target="_blank"/);
  assert.match(linkified, /rel="noopener noreferrer"/);
  for (const source of [conversation, linkified, parser]) {
    assert.doesNotMatch(source, /dangerouslySetInnerHTML|innerHTML/);
  }
});

test("every chat entry point shares the single ChatAssistantModal conversation renderer", async () => {
  const files = [
    "../src/components/ChatUIMount.tsx",
    "../src/components/HomePageClient.tsx",
    "../src/components/people/PersonProfileContent.tsx",
    "../src/components/services/ChatModalController.tsx",
    "../src/components/services/ChatModalControllerAI.tsx",
  ];
  for (const file of files) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    // Entry points reach the single modal through the owner-scoped wrapper (HD-CHAT-001 Phase 0).
    assert.match(source, /ChatAssistantModal|UserScopedChatAssistant/, file);
  }
  const scoped = await readFile(new URL("../src/components/assistant/UserScopedChatAssistant.tsx", import.meta.url), "utf8");
  assert.match(scoped, /<ChatAssistantModal/);
  const modal = await readFile(new URL("../src/components/ChatAssistantModal.tsx", import.meta.url), "utf8");
  assert.match(modal, /<ConversationView/);
});

test("hardening: long runs of closing brackets after a URL parse in linear time", () => {
  for (const tail of [")", "]", "}", ".)"]) {
    const started = Date.now();
    const segments = parseMessageLinks(`https://a.test/x${tail.repeat(150_000)}`);
    assert.ok(Date.now() - started < 1_000, `tail ${tail} too slow`);
    assert.deepEqual(links(segments), [], "oversized candidates are not links");
  }
  const started = Date.now();
  const segments = parseMessageLinks(`https://a.test/x${")".repeat(1_500)}`);
  assert.ok(Date.now() - started < 500);
  assert.equal(links(segments)[0].href, "https://a.test/x");
  assert.equal(plain(segments), ")".repeat(1_500));
});

test("hardening: a label cannot name a different site than the link target", () => {
  const shown = (text) => links(parseMessageLinks(text))[0].label;
  assert.equal(shown("[rozetka.com.ua](https://evil.test/phish)"), "evil.test/phish");
  assert.equal(shown("[Купити на Rozetka.com.ua](https://evil.test/p)"), "evil.test/p");
  assert.equal(shown("[https://rozetka.com.ua/x](https://evil.test/phish)"), "evil.test/phish");
  assert.equal(shown("[www.rozetka.com.ua](https://rozetka.com.ua.evil.test/)"), "rozetka.com.ua.evil.test");
  assert.equal(shown("[rozetka.com.ua](https://evil-rozetka.com.ua/)"), "evil-rozetka.com.ua");
  // honest labels are kept
  assert.equal(shown("[rozetka.com.ua](https://rozetka.com.ua/p1/)"), "rozetka.com.ua");
  assert.equal(shown("[Rozetka: набір LEGO](https://www.rozetka.com.ua/p1/)"), "Rozetka: набір LEGO");
  assert.equal(shown("[Набір LEGO Classic](https://rozetka.com.ua/lego/)"), "Набір LEGO Classic");
  assert.equal(shown("[m.rozetka.com.ua](https://rozetka.com.ua/x)"), "m.rozetka.com.ua");
});

test("hardening: bidi and invisible characters are stripped from labels", () => {
  const [link] = links(parseMessageLinks("[\u202Egi\u200Bft sh\u2066op](https://shop.example/a)"));
  assert.equal(link.label, "gift shop");
  assert.deepEqual(links(parseMessageLinks("[‮​](https://shop.example/a)")).map((l) => l.label), []);
  assert.equal(plain(parseMessageLinks("[‮​](https://shop.example/a)")), "[‮​](https://shop.example/a)");
});

test("hardening: unicode and lone surrogates never produce unsafe or throwing output", () => {
  const segments = parseMessageLinks("https://uk.wikipedia.org/wiki/Подарунок 😀 https://example.com/\uD800x [a\uDC00](https://example.com/)");
  assert.equal(links(segments).length, 3);
  for (const l of links(segments)) assert.match(l.href, /^https:\/\/[\x21-\x7e]+$/);
});
