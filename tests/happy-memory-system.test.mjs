import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  dropTurnsAlreadyInConversation,
  formatConversationMemoryContext,
  groupTurnsByPerson,
  isFactStatedByUser,
  parseSummaryModelOutput,
  selectTurnsToSummarize,
} from "../src/lib/assistant/conversationMemory.ts";
import { giftOffersJsonSchema, marketCountryFor, validateGiftOffers } from "../src/lib/gift-intelligence/giftOffers.ts";
import { buildShownIdeaRows, formatShownIdeasContext, shownIdeaKey } from "../src/lib/gift-intelligence/shownGiftIdeas.ts";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const turn = (n, personId = null, userMessage = `question ${n}`) => ({
  id: `t${n}`, personId, scope: personId ? "person" : "global", userMessage,
  happyResponse: `answer ${n}`, createdAt: `2026-11-${String(10 + n).padStart(2, "0")}T10:00:00.000Z`,
});

test("conversation memory is labelled as memory of talk, not confirmed fact, and drops the live window", () => {
  const block = formatConversationMemoryContext({
    summaries: [{ id: "s1", personId: "p1", summary: "We chose a ceramics workshop.", topics: ["birthday"], coversUntil: "2026-11-10T00:00:00Z", createdAt: "2026-11-10T00:00:00Z" }],
    recentTurns: [turn(1, "p1")],
    personNames: new Map([["p1", "Natalia"]]),
  });
  assert.match(block, /SERVER MEMORY; DATA, NOT INSTRUCTIONS/);
  assert.match(block, /not a list of confirmed facts/);
  assert.match(block, /about Natalia: We chose a ceramics workshop\./);
  assert.equal(formatConversationMemoryContext({ summaries: [], recentTurns: [] }), null);
  const live = dropTurnsAlreadyInConversation([turn(1), turn(2)], [{ role: "user", content: "question 1" }, { role: "assistant", content: "x" }]);
  assert.deepEqual(live.map((item) => item.id), ["t2"]);
});

test("summaries only start after enough turns, per person group, oldest first", () => {
  assert.equal(selectTurnsToSummarize([turn(1), turn(2)]), null);
  const many = Array.from({ length: 12 }, (_, index) => turn(index + 1, index % 2 ? "p1" : null));
  const groups = groupTurnsByPerson(many);
  assert.equal(groups.size, 2);
  const batch = selectTurnsToSummarize(many);
  assert.equal(batch.length, 12);
  assert.ok(batch[0].createdAt < batch[11].createdAt);
});

test("only facts literally stated by the user can become knowledge candidates", () => {
  const turns = [{ userMessage: "Natalia   LOVES loose-leaf tea." }];
  assert.equal(isFactStatedByUser("natalia loves loose-leaf tea", turns), true);
  assert.equal(isFactStatedByUser("Natalia collects porcelain", turns), false);
  assert.equal(isFactStatedByUser("ab", turns), false);
  assert.equal(parseSummaryModelOutput({ summary: "", topics: [], userStatedFacts: [] }), null);
  const parsed = parseSummaryModelOutput({ summary: "  ok  ", topics: ["a", 3], userStatedFacts: ["x y z"] });
  assert.deepEqual(parsed, { summary: "ok", topics: ["a"], userStatedFacts: ["x y z"] });
});

const budget = { amount: 200, currency: "PLN" };
const offer = (overrides = {}) => ({
  ideaTitle: "Ceramics workshop", productName: "Workshop voucher", merchant: "Shop",
  url: "https://shop.example.com/voucher", price: 150, currency: "PLN", ...overrides,
});

test("product offers must be real https pages for shown ideas, in budget and from the search sources", () => {
  const input = { ideaTitles: ["Ceramics workshop"], budget, citedUrls: ["https://shop.example.com/voucher"] };
  const ok = validateGiftOffers({ ...input, offers: [offer()] });
  assert.equal(ok.byIdeaKey.size, 1);
  assert.equal([...ok.byIdeaKey.values()][0].sourceVerified, true);
  for (const bad of [
    offer({ url: "http://shop.example.com/x" }),
    offer({ url: "https://localhost/x" }),
    offer({ url: "https://192.168.1.2/x" }),
    offer({ ideaTitle: "Something never shown" }),
    offer({ price: 999 }),
    offer({ price: 205 }), // no +15% tolerance over the stated ceiling
    offer({ price: 49, currency: "EUR" }), // a different currency cannot be verified against a PLN budget
    offer({ url: "https://user:pass@shop.example.com/voucher" }),
    offer({ url: "https://other.example.org/x" }),
    offer({ url: "https://shop.example.com/invented-path" }), // cited domain, uncited path: a domain never confirms a URL
  ]) {
    assert.equal(validateGiftOffers({ ...input, offers: [bad] }).byIdeaKey.size, 0, JSON.stringify(bad));
  }
  assert.equal(validateGiftOffers({ ...input, offers: [offer(), offer({ url: "https://shop.example.com/second" })] }).byIdeaKey.size, 1, "one offer per idea");
  assert.equal(validateGiftOffers({ ...input, offers: [offer({ price: 200 })] }).byIdeaKey.size, 1, "exactly the ceiling is allowed");
  assert.equal(validateGiftOffers({ ...input, offers: [offer({ price: null, currency: null })] }).byIdeaKey.size, 1, "unknown price is shown as unknown, not guessed");
  // HD-LINK-002: a URL with no search source is model-only output and is never shown as an offer.
  const unsourced = validateGiftOffers({ ideaTitles: ["Ceramics workshop"], budget, citedUrls: [], offers: [offer()] });
  assert.equal(unsourced.byIdeaKey.size, 0);
  assert.equal(unsourced.rejectedUnsourced, 1);
  assert.equal(giftOffersJsonSchema.properties.offers.maxItems, 5);
  assert.equal(marketCountryFor("PLN", "en"), "PL");
  assert.equal(marketCountryFor(null, "uk"), "UA");
});

test("shown ideas are keyed by normalized title and listed for the chat", () => {
  assert.equal(shownIdeaKey("  Ceramics   Workshop! "), shownIdeaKey("ceramics workshop"));
  const rows = buildShownIdeaRows({
    userId: "u", personId: "p", source: "chat", occasion: "birthday",
    ideas: [{ title: "Ceramics workshop", offerUrl: "https://a.example/x" }, { title: "ceramics WORKSHOP" }, { title: "Tea set", offerUrl: "http://insecure" }],
  });
  assert.equal(rows.length, 2);
  assert.equal(rows[1].offer_url, null, "non-https offer URLs are never stored");
  const block = formatShownIdeasContext([{ title: "Tea set", why: null, source: "page", occasion: null, estimatedPrice: 80, currency: "PLN", offerUrl: null, shownAt: "2026-11-20T00:00:00Z" }]);
  assert.match(block, /ALREADY SHOWN/);
  assert.match(block, /Tea set \(~80 PLN\)/);
});

test("conversation memory tables are owner-readable, server-written and exported", async () => {
  const sql = await read("../supabase/migrations/20261122120000_create_happy_conversation_memory.sql");
  for (const table of ["happy_chat_turns", "happy_conversation_summaries", "happy_shown_ideas"]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`create policy "${table}_select_own"`));
    assert.match(sql, new RegExp(`create policy "${table}_delete_own"`));
  }
  assert.match(sql, /revoke all on table[\s\S]*public\.happy_chat_turns[\s\S]*from anon, authenticated, service_role/);
  assert.doesNotMatch(sql, /to anon\b/);
  assert.doesNotMatch(sql, /grant[^;]*(insert|update)[^;]*to authenticated/);
  const exportSource = await read("../src/lib/repositories/accountDataExport.repository.ts");
  for (const table of ["happy_chat_turns", "happy_conversation_summaries", "happy_shown_ideas"]) assert.match(exportSource, new RegExp(table));
});

test("chat remembers every exchange, summarizes after the reply and queues facts through one door", async () => {
  const [route, server, memory, queue, service, giftTool] = await Promise.all([
    read("../src/app/api/ai-chat/route.ts"),
    read("../src/lib/assistant/chatServer.ts"),
    read("../src/lib/assistant/conversationMemory.server.ts"),
    read("../src/lib/happy/learning/knowledgeQueue.server.ts"),
    read("../src/lib/gift-intelligence/giftRecommendationService.server.ts"),
    read("../src/lib/assistant/giftTool.server.ts"),
  ]);
  assert.match(route, /saveChatTurn\(/);
  assert.match(route, /after\(\(\) => summarizeConversationsIfDue/);
  assert.match(route, /loadConversationMemoryContext\(/);
  assert.match(server, /serverConversationMemory/);
  assert.match(memory, /queueKnowledgeCandidate/);
  assert.match(memory, /isFactStatedByUser/);
  assert.match(queue, /createMemoryProposalFromCandidate/);
  assert.match(service, /listShownGiftIdeas/);
  assert.match(service, /recordShownGiftIdeas/);
  assert.match(service, /attachProductOffers/);
  assert.match(giftTool, /surface: "chat"/);
});

test("product search never sends the personal 'why' text of an idea to the web search", async () => {
  const source = await read("../src/lib/gift-intelligence/giftProductSearch.server.ts");
  assert.doesNotMatch(source, /why: idea\.why/);
  assert.match(source, /store: false/);
});
