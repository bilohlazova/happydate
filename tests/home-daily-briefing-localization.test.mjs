import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const locales = ["pl", "uk", "en", "ru", "de"];
const required = [
  "greetingNamed", "greetingFallback", "todayNone", "todayEvents", "upcoming",
  "savedGiftIdea", "savedPreference", "giftOffer", "giftQuestion", "preferenceQuestion",
];

test("daily briefing copy exists in every supported Home locale", async () => {
  for (const locale of locales) {
    const messages = JSON.parse(await readFile(path.join(process.cwd(), "messages", locale, "home.json"), "utf8"));
    for (const key of required) {
      assert.equal(typeof messages.brief[key], "string", `${locale}:brief.${key}`);
      assert.ok(messages.brief[key].trim(), `${locale}:brief.${key}`);
    }
  }
});
