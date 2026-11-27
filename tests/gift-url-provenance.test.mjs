import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import {
  PHASE0_ASSIGNABLE_ORIGINS,
  createUrlEvidenceRegistry,
  extractEvidenceUrls,
  isConfirmedProduct,
  normalizeEvidenceUrl,
  parseUntrustedOrigin,
  provenanceFor,
} from "../src/lib/gift-intelligence/urlProvenance.ts";
import { validateGiftOffers } from "../src/lib/gift-intelligence/giftOffers.ts";
import { mapSavedGiftLinkRows } from "../src/lib/assistant/savedGiftLinkContext.server.ts";
import { formatAssistantSavedGiftLinkContext } from "../src/lib/assistant/chatContract.ts";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const budget = { amount: 200, currency: "PLN" };
const offer = (overrides = {}) => ({
  ideaTitle: "Ceramics workshop", productName: "Workshop voucher", merchant: "Shop",
  url: "https://shop.example.com/voucher", price: 150, currency: "PLN", ...overrides,
});

test("a URL that exists only in model output is unknown and never confirmed", () => {
  const registry = createUrlEvidenceRegistry({});
  for (const url of ["https://shop.example.com/product/12345", "https://amazon.com/dp/B000FAKE00", "not a url", "javascript:alert(1)", "http://shop.example.com/x"]) {
    const provenance = registry.classify(url);
    assert.equal(provenance.origin, "unknown", url);
    assert.equal(isConfirmedProduct(provenance), false);
    assert.equal(provenance.availability, "not_checked");
    assert.equal(provenance.productConfirmation, "not_confirmed");
    assert.equal(provenance.priceFreshness, "not_checked");
  }
});

test("origin, availability, product confirmation and price freshness are separate dimensions", () => {
  const provenance = provenanceFor("search_sourced");
  assert.deepEqual(Object.keys(provenance).sort(), ["availability", "origin", "priceFreshness", "productConfirmation"]);
  assert.equal("verified" in provenance, false, "no single catch-all verified flag");
  assert.equal(Object.isFrozen(provenance), true);
  // Even a search-sourced URL is not a confirmed product, reachable page or current price.
  assert.equal(isConfirmedProduct(provenance), false);
});

test("links the user sent are user_provided, but assistant text cannot create that evidence", () => {
  const registry = createUrlEvidenceRegistry({ userMessages: ["Look at https://shop.example.com/gift-1, please."] });
  assert.equal(registry.classify("https://shop.example.com/gift-1").origin, "user_provided");
  assert.equal(registry.classify("https://shop.example.com/gift-2").origin, "unknown");
  assert.deepEqual(extractEvidenceUrls("see https://a.example/x). and http://b.example/y"), ["https://a.example/x"]);
});

test("old stored URLs without provenance are saved_unverified and never confirmed", () => {
  const rows = [
    { url: "https://old-shop.example/item/1", title: "Old", merchant: "Old shop", is_preferred: true, decision_note: "liked" },
    { url: "http://insecure.example/x", title: "dropped" },
    { url: "javascript:alert(1)", title: "dropped" },
    { url: "https://old-shop.example/item/2", title: null, merchant: null, is_preferred: false, decision_note: null },
  ];
  const mapped = mapSavedGiftLinkRows(rows);
  assert.equal(mapped.length, 2);
  for (const link of mapped) {
    assert.equal(link.provenance.origin, "saved_unverified");
    assert.equal(isConfirmedProduct(link.provenance), false);
  }
  assert.equal(mapped[0].url, "https://old-shop.example/item/1", "stored URL is passed through unchanged");
  // A row cannot upgrade itself: extra fields are not read.
  const forged = mapSavedGiftLinkRows([{ url: "https://old-shop.example/item/3", origin: "product_verified", provenance: { origin: "product_verified" }, verified: true }]);
  assert.equal(forged[0].provenance.origin, "saved_unverified");
  // Same rows in a new session give the same result (stateless mapping, no cached claims).
  assert.deepEqual(mapSavedGiftLinkRows(rows), mapped);
});

test("HappyBot context never presents a saved link as proof of freshness", () => {
  const context = formatAssistantSavedGiftLinkContext(mapSavedGiftLinkRows([{ url: "https://old-shop.example/item/1", title: "Tea set", merchant: "Old shop", is_preferred: false }]));
  assert.ok(context);
  assert.doesNotMatch(context, /SERVER-VERIFIED/);
  assert.match(context, /LINKS ARE NOT VERIFIED/);
  assert.match(context, /origin saved_unverified; availability not checked; product match not confirmed; price not checked/);
  assert.doesNotMatch(context, /product_verified|in stock|available now/i);
  // Rows built by older callers without provenance get the same safe wording.
  const legacy = formatAssistantSavedGiftLinkContext([{ url: "https://x.example/a", title: null, merchant: null, isPreferred: false, decisionNote: null }]);
  assert.match(legacy, /origin saved_unverified/);
});

test("a cited domain with a different path does not confirm the URL", () => {
  const input = { ideaTitles: ["Ceramics workshop"], budget, citedUrls: ["https://shop.example.com/voucher"] };
  const exact = validateGiftOffers({ ...input, offers: [offer()] });
  assert.equal(exact.byIdeaKey.size, 1);
  const entry = [...exact.byIdeaKey.values()][0];
  assert.equal(entry.sourceVerified, true);
  assert.equal(entry.provenance.origin, "search_sourced");
  assert.equal(isConfirmedProduct(entry.provenance), false, "search-sourced is not a confirmed product");
  const wrongPath = validateGiftOffers({ ...input, offers: [offer({ url: "https://shop.example.com/voucher-INVENTED-99" })] });
  assert.equal(wrongPath.byIdeaKey.size, 0);
  assert.equal(wrongPath.rejectedHostOnly, 1);
  const otherHost = validateGiftOffers({ ...input, offers: [offer({ url: "https://shop-example.com/voucher" })] });
  assert.equal(otherHost.byIdeaKey.size, 0);
  assert.equal(otherHost.rejectedUnsourced, 1);
  const noSources = validateGiftOffers({ ...input, citedUrls: [], offers: [offer()] });
  assert.equal(noSources.byIdeaKey.size, 0, "model-only URL is never kept");
});

test("tracking parameters and fragments do not change the evidence, different pages of one shop stay different", () => {
  const input = { ideaTitles: ["Ceramics workshop"], budget, citedUrls: ["https://shop.example.com/voucher?utm_source=chatgpt.com#top"] };
  assert.equal(validateGiftOffers({ ...input, offers: [offer()] }).byIdeaKey.size, 1);
  const a = normalizeEvidenceUrl("https://shop.example.com/p/1");
  const b = normalizeEvidenceUrl("https://shop.example.com/p/2");
  assert.notEqual(a, b);
  assert.notEqual(normalizeEvidenceUrl("https://www.shop.example.com/p/1"), a, "www is a different host for evidence");
  assert.notEqual(normalizeEvidenceUrl("https://shop.example.com/p/1?variant=2"), a, "a real query parameter is part of the page");
  const registry = createUrlEvidenceRegistry({ searchSourcedUrls: ["https://shop.example.com/p/1"] });
  assert.equal(registry.classify("https://shop.example.com/p/1#reviews").origin, "search_sourced");
  assert.equal(registry.classify("https://shop.example.com/p/2").origin, "unknown");
  assert.equal(normalizeEvidenceUrl("https://user:pw@shop.example.com/p/1"), null);
  assert.equal(normalizeEvidenceUrl("http://shop.example.com/p/1"), null);
});

test("origin cannot be forged from a client, a request body or a model", async () => {
  for (const claim of ["product_verified", "search_sourced", "user_provided", { origin: "product_verified" }, null, undefined]) {
    assert.equal(parseUntrustedOrigin(claim), "unknown");
  }
  assert.equal(PHASE0_ASSIGNABLE_ORIGINS.includes("product_verified"), false);
  const files = ["src/app/api/ai-chat/route.ts", "src/lib/assistant/chatServer.ts", "src/lib/assistant/chatClient.ts", "src/lib/gifts/gift.persistence.ts", "src/lib/gifts/gift.loaders.ts"];
  for (const file of files) {
    const text = await source(file);
    assert.doesNotMatch(text, /product_verified|provenance|urlOrigin/, `${file} must not read or assign provenance`);
  }
  // Only the provenance module itself may mention the reserved status.
  const all = await Promise.all(["src/lib/gift-intelligence/giftOffers.ts", "src/lib/assistant/savedGiftLinkContext.server.ts", "src/components/chat-assistant/ConversationView.tsx"].map(source));
  for (const text of all) assert.doesNotMatch(text, /provenanceFor\("product_verified"\)|origin:\s*"product_verified"/);
});

test("phase 0 performs no outbound requests and changes no database shape", async () => {
  const text = await source("src/lib/gift-intelligence/urlProvenance.ts");
  assert.doesNotMatch(text, /\bfetch\(|XMLHttpRequest|node:http|node:https|node:net|node:dns|import\s+.*server-only/);
  const persistence = await source("src/lib/gifts/gift.persistence.ts");
  assert.match(persistence, /const LINK_COLUMNS =\s*"id, person_id, event_id, gift_id, url, title, merchant, image_url, price_amount, currency, is_preferred, decision_note, created_at, updated_at"/);
  const migrations = await readdir(new URL("../supabase/migrations", import.meta.url));
  const newest = migrations.sort().at(-1);
  assert.ok(newest, "migrations exist");
  for (const name of migrations.filter((file) => file >= "20261123")) {
    const sql = await source(`supabase/migrations/${name}`);
    assert.doesNotMatch(sql, /gift_links[\s\S]{0,200}(provenance|link_status|source)/i, `${name} must not alter gift_links in phase 0`);
  }
});

test("saved ideas stay per person and per user at the data boundary", async () => {
  const loader = await source("src/lib/assistant/savedGiftLinkContext.server.ts");
  assert.match(loader, /\.eq\("user_id", userId\)\s*\.eq\("person_id", personId\)/);
  const persistence = await source("src/lib/gifts/gift.persistence.ts");
  assert.match(persistence, /from\("gift_links"\)\.select\(LINK_COLUMNS\)\.eq\("user_id", userId\)/);
  assert.match(persistence, /\.eq\("id", linkId\)\.eq\("user_id", userId\)/);
  const migration = await source("supabase/migrations/20260808094421_create_gift_lifecycle_and_saved_links.sql");
  assert.match(migration, /foreign key \(gift_id, user_id, person_id\)/);
  assert.match(migration, /create policy "gift_links_select_own"[\s\S]*\(select auth\.uid\(\)\) = user_id/);
  const exporter = await source("src/lib/repositories/accountDataExport.repository.ts");
  assert.match(exporter, /exportOwnedRows\("gift_links", user\.id\)/, "export still covers gift_links unchanged");
});

test("the chat and the profile mark links as unchecked in every locale, without inventing verified claims", async () => {
  const view = await source("src/components/chat-assistant/ConversationView.tsx");
  assert.match(view, /createUrlEvidenceRegistry/);
  assert.match(view, /link-unverified-note/);
  const manager = await source("src/components/people/PersonGiftManager.tsx");
  assert.match(manager, /data-url-origin="saved_unverified"/);
  for (const locale of ["en", "uk", "pl", "de", "ru"]) {
    const assistant = JSON.parse(await source(`messages/${locale}/assistant.json`));
    for (const key of ["userProvided", "savedUnverified", "searchSourced", "unknown"]) {
      assert.ok(assistant.giftLinks.origin[key]?.length > 5, `${locale} origin.${key}`);
    }
    assert.ok(assistant.giftLinks.unverifiedNote.length > 20, `${locale} note`);
    const person = JSON.parse(await source(`messages/${locale}/person.json`));
    assert.ok(person.profileUi.gifts.linkUnverified.length > 10, `${locale} linkUnverified`);
  }
});
