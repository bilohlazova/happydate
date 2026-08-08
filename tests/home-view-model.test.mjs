import assert from "node:assert/strict";
import test from "node:test";
import { buildHomeViewModel } from "../src/lib/home/buildHomeViewModel.ts";

const messages = {
  "greeting.named": "Cześć, {name}!", "greeting.fallback": "Cześć!", "greeting.subtitle": "Dziś",
  "countdown.today": "dzisiaj", "countdown.tomorrow": "jutro", "countdown.days": "za {count} dni",
  "events.birthdayTitle": "Urodziny: {name}", "featured.importantLabel": "Ważna", "featured.nextLabel": "Następna",
  "featured.personCta": "Profil", "featured.eventCta": "Kalendarz",
  "metrics.savedGifts": "{count} gifts", "metrics.notes": "{count} notes", "metrics.memories": "{count} memories",
  "categories.birthday": "Birthday", "categories.anniversary": "Anniversary", "categories.work": "Work", "categories.personal": "Personal",
  "recommendations.reviewGiftsTitle": "Review", "recommendations.reviewGiftsDescription": "{count} gifts",
  "recommendations.addGiftTitle": "Add gift", "recommendations.addGiftDescription": "Gift {name}",
  "recommendations.addContextTitle": "Add context", "recommendations.addContextDescription": "Context {name}",
  "recommendations.memoriesTitle": "Memories", "recommendations.memoriesDescription": "{count} memories",
  "insights.birthday": "Birthday {name} {countdown}", "insights.event": "{title} {countdown}",
  "insights.savedGifts": "{count} saved", "insights.hasPreferences": "Preferences {name}",
  "brief.intro": "{count} things.", "brief.featured": "{title} {countdown}.",
  "brief.greetingNamed": "Hello {name}.", "brief.greetingFallback": "Hello.",
  "brief.todayNone": "Nothing important today.", "brief.todayEvents": "Today: {events}.",
  "brief.upcoming": "Upcoming: {title}, {countdown}.",
  "brief.savedGiftIdea": "Gift for {name}: {value}.",
  "brief.savedPreference": "About {name}: {value}.",
  "brief.giftOffer": "I can help with {name}.",
  "brief.giftQuestion": "Choose a gift for {name}?",
  "brief.preferenceQuestion": "Add a preference for {name}?",
};
const t = (key, values = {}) => Object.entries(values).reduce((value, [name, replacement]) => value.replaceAll(`{${name}}`, String(replacement)), messages[key] ?? key);

function data(overrides = {}) {
  return {
    isAuthenticated: true, profile: { fullName: "Maria Test" }, authMetadataName: null, email: "mail@example.com",
    people: [], events: [], memories: [], errors: [], ...overrides,
  };
}

test("featured event prefers a supported important event inside seven days", () => {
  const model = buildHomeViewModel(data({ events: [
    { id: "normal", title: "Normal", date: "2026-07-18", category: "personal", notes: null },
    { id: "anniversary", title: "Anniversary", date: "2026-07-20", category: "anniversary", notes: null },
  ] }), "pl", t, new Date(2026, 6, 17));
  assert.equal(model.featuredEvent?.id, "anniversary");
});

test("regular events never inherit a person by matching the title", () => {
  const model = buildHomeViewModel(data({
    people: [{ id: "p1", name: "Ola", birthday: null, relationLabel: "Siostra" }],
    events: [{ id: "e1", title: "Ola", date: "2026-07-18", category: null, notes: null }],
  }), "pl", t, new Date(2026, 6, 17));
  assert.equal(model.featuredEvent?.personId, null);
  assert.equal(model.featuredEvent?.metrics.length, 0);
});

test("birthday metrics count active projected knowledge and exclude journal", () => {
  const model = buildHomeViewModel(data({
    people: [{ id: "p1", name: "Ola", birthday: "1990-07-20", relationLabel: "Siostra" }],
    memories: [
      { id: "g", personId: "p1", eventId: null, category: "gift", title: null, value: "Book", occurredOn: null, createdAt: null, isActive: true },
      { id: "n", personId: "p1", eventId: null, category: "note", title: null, value: "Note", occurredOn: null, createdAt: null, isActive: true },
      { id: "off", personId: "p1", eventId: null, category: "gift", title: null, value: "Hidden", occurredOn: null, createdAt: null, isActive: false },
    ],
  }), "pl", t, new Date(2026, 6, 17));
  assert.deepEqual(model.featuredEvent?.metrics.map((metric) => [metric.id, metric.count]), [["gifts", 1], ["notes", 1]]);
});

test("profile name falls back to auth metadata and then email", () => {
  const metadata = buildHomeViewModel(data({ profile: { fullName: "" }, authMetadataName: "Anna Kowalska" }), "pl", t);
  assert.equal(metadata.greeting.name, "Anna");
  const email = buildHomeViewModel(data({ profile: null, authMetadataName: null, email: "kasia@example.com" }), "pl", t);
  assert.equal(email.greeting.name, "kasia");
});

test("daily briefing is personalized, traceable and uses confirmed saved context", () => {
  const model = buildHomeViewModel(data({
    people: [{ id: "p1", name: "Ola", birthday: "1990-07-22", relationLabel: "Siostra" }],
    memories: [
      { id: "g1", personId: "p1", eventId: null, category: "gift", title: null, value: "Album", occurredOn: null, createdAt: null, isActive: true },
    ],
  }), "pl", t, new Date(2026, 6, 17));

  assert.equal(model.assistantActions.briefing.sections[0].kind, "greeting");
  assert.match(model.assistantActions.briefText, /Hello Maria/);
  assert.match(model.assistantActions.briefText, /Urodziny: Ola/);
  assert.match(model.assistantActions.briefText, /Gift for Ola: Album/);
  assert.deepEqual(model.assistantActions.briefing.sourceIds, ["birthday-p1", "g1"]);
});

test("daily briefing never describes a saved gift idea as purchased or given", () => {
  const model = buildHomeViewModel(data({
    people: [{ id: "p1", name: "Ola", birthday: "1990-07-18", relationLabel: "Siostra" }],
    memories: [
      { id: "g1", personId: "p1", eventId: null, category: "gift", title: null, value: "Flowers", occurredOn: null, createdAt: null, isActive: true },
    ],
  }), "pl", t, new Date(2026, 6, 17));
  assert.doesNotMatch(model.assistantActions.briefText, /bought|given|purchased/i);
  assert.match(model.assistantActions.briefText, /Gift for Ola: Flowers/);
});

test("care question timing asks at most one question only inside preparation windows", () => {
  const near = buildHomeViewModel(data({
    people: [{ id: "p1", name: "Ola", birthday: "1990-07-27", relationLabel: "Siostra" }],
  }), "pl", t, new Date(2026, 6, 17));
  const nearQuestions = near.assistantActions.briefing.sections.filter((section) => section.kind === "care-question");
  assert.equal(nearQuestions.length, 1);
  assert.match(nearQuestions[0].text, /Choose a gift/);

  const distant = buildHomeViewModel(data({
    people: [{ id: "p1", name: "Ola", birthday: "1990-09-27", relationLabel: "Siostra" }],
  }), "pl", t, new Date(2026, 6, 17));
  assert.equal(distant.assistantActions.briefing.sections.some((section) => section.kind === "care-question"), false);
});
