import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { formatFriendlyFirstName } from "../src/i18n/friendlyName.ts";
import { canonicalizeGiftPreference, localizeGiftPreference } from "../src/i18n/giftPreferenceCategories.ts";

test("friendly greeting uses only a confirmed first name and conservative Ukrainian vocative", () => {
  assert.equal(formatFriendlyFirstName("Марія", "uk"), "Маріє");
  assert.equal(formatFriendlyFirstName("Anna Maria", "pl"), "Anna Maria");
  assert.equal(formatFriendlyFirstName("", "uk"), null);
  assert.equal(formatFriendlyFirstName(null, "en"), null);
});

test("standard gift categories localize without changing storage IDs or custom values", () => {
  assert.equal(localizeGiftPreference("travel", "uk"), "Подорожі");
  assert.equal(localizeGiftPreference("clothes", "de"), "Kleidung");
  assert.equal(localizeGiftPreference("books", "ru"), "Книги");
  assert.equal(localizeGiftPreference("Гори", "uk"), "Гори");
  assert.equal(canonicalizeGiftPreference("Подорожі", "uk"), "travel");
  assert.equal(canonicalizeGiftPreference("Гори", "uk"), "Гори");
});

test("Home and Happy Chat consume the trusted first name while Profile has no settings block", async () => {
  const [home, dashboard, wellbeing, chat, profile] = await Promise.all([
    readFile(new URL("../src/components/HomePageClient.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/home-dashboard/HomeDashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/home-dashboard/WellbeingCheckIn.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/ChatAssistantModal.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/(app)/profile/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(home, /profile\?\.firstName \?\? viewModel\.greeting\.name/);
  assert.match(dashboard, /userName=\{firstName\}/);
  assert.match(wellbeing, /formatFriendlyFirstName\(userName, appLocale\)/);
  assert.match(wellbeing, /friendlyName \? `, \$\{friendlyName\}` : ""/);
  assert.match(chat, /formatFriendlyFirstName\(homeContext\.userName/);
  assert.doesNotMatch(profile, /settings\.title|LanguageSwitcher|gift_outcome_learning_enabled/);
});
