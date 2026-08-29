import assert from "node:assert/strict";
import test from "node:test";
import { buildHomeViewModel } from "../src/lib/home/buildHomeViewModel.ts";
import { briefingTextForMode } from "../src/lib/home/buildDailyBriefing.ts";

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
  "recommendations.giftOutcomeTitle": "Did {name} like it?", "recommendations.giftOutcomeDescription": "How was {gift}?",
  "insights.birthday": "Birthday {name} {countdown}", "insights.event": "{title} {countdown}",
  "insights.savedGifts": "{count} saved", "insights.hasPreferences": "Preferences {name}",
  "brief.intro": "{count} things.", "brief.featured": "{title} {countdown}.",
  "brief.greetingNamed": "Hello {name}.", "brief.greetingFallback": "Hello.",
  "brief.todayNone": "Nothing important today.", "brief.todayEvents": "Today: {events}.",
  "brief.todayScheduled": "Today by time: {events}.",
  "brief.todayMixed": "Today by time: {scheduled}. Also without a specific time: {unscheduled}.",
  "brief.eventAtLocation": "{event}, at {location}",
  "brief.eventWithTravelBuffer": "{event}. Leave {minutes} minutes for travel",
  "brief.upcoming": "Upcoming: {title}, {countdown}.",
  "brief.savedGiftIdea": "Gift for {name}: {value}.",
  "brief.savedPreference": "About {name}: {value}.",
  "brief.giftOffer": "I can help with {name}.",
  "brief.giftQuestion": "Choose a gift for {name}?",
  "brief.preferenceQuestion": "Add a preference for {name}?",
  "brief.postGiftQuestion": "Did {name} like {gift}?",
  "brief.knowledgeReviewQuestion": "Is {value} about {name} still accurate?",
  "recommendations.knowledgeReviewTitle": "Review {name}",
  "recommendations.knowledgeReviewDescription": "Still accurate: {value}?",
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

test("a birthday with a confirmed birth year shows the age reached on that occurrence", () => {
  const model = buildHomeViewModel(data({
    people: [{ id: "p1", name: "Ola", birthday: "1990-07-20", relationLabel: "Siostra" }],
  }), "pl", t, new Date(2026, 6, 17));
  assert.equal(model.featuredEvent?.birthdayAge, 36);

  const withoutYear = buildHomeViewModel(data({
    people: [{ id: "p2", name: "Maja", birthday: "07-20", relationLabel: "Siostra" }],
  }), "pl", t, new Date(2026, 6, 17));
  assert.equal(withoutYear.featuredEvent?.birthdayAge, null);
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

test("daily briefing orders today's timed events and separates events without a time", () => {
  const model = buildHomeViewModel(data({ events: [
    { id: "free", title: "Call Mum", date: "2026-07-17", timeOfDay: null, category: "personal", notes: null },
    { id: "late", title: "Team sync", date: "2026-07-17", timeOfDay: "14:30", category: "work", notes: null },
    { id: "early", title: "Dentist", date: "2026-07-17", timeOfDay: "09:00", location: "Main Street 5", travelBufferMinutes: 20, category: "personal", notes: null },
  ] }), "pl", t, new Date(2026, 6, 17));

  const text = model.assistantActions.briefing.sections.find((section) => section.kind === "today")?.text ?? "";
  assert.match(text, /09:00 — Dentist, at Main Street 5\. Leave 20 minutes for travel, 14:30 — Team sync/);
  assert.match(text, /without a specific time: Call Mum/);
  assert.ok(text.indexOf("Dentist") < text.indexOf("Team sync"));
  assert.ok(text.indexOf("Team sync") < text.indexOf("Call Mum"));
  assert.deepEqual(model.assistantActions.briefing.sections.find((section) => section.kind === "today")?.sourceIds, ["early", "late", "free"]);
});

test("Home cards show a confirmed event time and birthdays remain without one", () => {
  const timed = buildHomeViewModel(data({ events: [
    { id: "meeting", title: "Meeting", date: "2026-07-17", timeOfDay: "10:15", category: "work", notes: null },
  ] }), "pl", t, new Date(2026, 6, 17));
  assert.equal(timed.featuredEvent?.timeOfDay, "10:15");
  assert.equal(timed.upcomingEvents[0]?.timeOfDay, "10:15");

  const birthday = buildHomeViewModel(data({
    people: [{ id: "p1", name: "Ola", birthday: "1990-07-17", relationLabel: "Siostra" }],
  }), "pl", t, new Date(2026, 6, 17));
  assert.equal(birthday.featuredEvent?.timeOfDay, null);
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

test("Home asks for at most one explicit post-gift outcome and stops after confirmation", () => {
  const pending = buildHomeViewModel(data({
    people: [{ id: "p1", name: "Ola", birthday: "1990-07-20", relationLabel: "Siostra" }],
    pendingGiftOutcomes: [
      { id: "new", personId: "p1", title: "Album", givenAt: "2026-07-17" },
      { id: "old", personId: "p1", title: "Flowers", givenAt: "2026-07-16" },
    ],
  }), "pl", t, new Date(2026, 6, 17));
  const prompts = pending.recommendations.filter((item) => item.id.startsWith("gift-outcome-"));
  assert.equal(prompts.length, 1);
  assert.equal(prompts[0].id, "gift-outcome-new");
  assert.equal(prompts[0].href, "/people/p1#gift-workspace");
  assert.match(prompts[0].description, /Album/);
  const detailed = pending.assistantActions.briefing;
  assert.equal(detailed.sections.filter((section) => section.kind.endsWith("question")).length, 1);
  assert.match(detailed.text, /Did Ola like Album/);
  assert.doesNotMatch(briefingTextForMode(detailed, "short"), /Album|Did Ola like/);

  const answered = buildHomeViewModel(data({
    people: [{ id: "p1", name: "Ola", birthday: null, relationLabel: "Siostra" }],
    pendingGiftOutcomes: [],
  }), "pl", t, new Date(2026, 6, 17));
  assert.equal(answered.recommendations.some((item) => item.id.startsWith("gift-outcome-")), false);
});

test("Home surfaces one oldest due knowledge review only in the detailed briefing", () => {
  const confirmed = (id, value, confirmedAt, overrides = {}) => ({
    id, personId: "p1", eventId: null, category: "preference", title: null, value,
    occurredOn: null, createdAt: confirmedAt, isActive: true, polarity: "likes",
    userConfirmed: true, confirmedAt, reviewedAt: null, snoozedUntil: null, ...overrides,
  });
  const model = buildHomeViewModel(data({
    people: [{ id: "p1", name: "Ola", birthday: null, relationLabel: "Siostra" }],
    memories: [
      confirmed("newer", "Coffee", "2025-06-01T00:00:00.000Z"),
      confirmed("oldest", "Tea", "2025-01-01T00:00:00.000Z"),
    ],
  }), "pl", t, new Date("2026-08-10T12:00:00.000Z"));

  assert.equal(model.recommendations.filter((item) => item.knowledgeReview).length, 1);
  assert.equal(model.recommendations.find((item) => item.knowledgeReview)?.id, "knowledge-review-oldest");
  assert.equal(model.recommendations.find((item) => item.knowledgeReview)?.href, "/people/p1#knowledge-review");
  const questions = model.assistantActions.briefing.sections.filter((section) => section.kind.endsWith("question"));
  assert.equal(questions.length, 1);
  assert.equal(questions[0].kind, "knowledge-review-question");
  assert.match(questions[0].text, /Tea/);
  assert.doesNotMatch(briefingTextForMode(model.assistantActions.briefing, "short"), /Tea|still accurate/);
});

test("urgent care, gift feedback, snooze and conflicts suppress Home knowledge review speech", () => {
  const memory = (id, polarity = "likes", overrides = {}) => ({
    id, personId: "p1", eventId: null, category: "preference", title: null, value: "Tea",
    occurredOn: null, createdAt: "2025-01-01T00:00:00.000Z", isActive: true,
    polarity, userConfirmed: true, confirmedAt: "2025-01-01T00:00:00.000Z",
    reviewedAt: null, snoozedUntil: null, ...overrides,
  });
  const now = new Date("2026-08-10T12:00:00.000Z");
  const person = { id: "p1", name: "Ola", birthday: "1990-08-15", relationLabel: "Siostra" };
  const urgent = buildHomeViewModel(data({ people: [person], memories: [memory("due")] }), "pl", t, now);
  assert.equal(urgent.assistantActions.briefing.sections.filter((section) => section.kind.endsWith("question")).length, 1);
  assert.equal(urgent.assistantActions.briefing.sections.some((section) => section.kind === "knowledge-review-question"), false);
  assert.equal(urgent.recommendations.some((item) => item.knowledgeReview), false);

  const gift = buildHomeViewModel(data({ people: [{ ...person, birthday: null }], memories: [memory("due")], pendingGiftOutcomes: [{ id: "gift", personId: "p1", title: "Album", givenAt: "2026-08-09" }] }), "pl", t, now);
  assert.equal(gift.assistantActions.briefing.sections.some((section) => section.kind === "knowledge-review-question"), false);
  assert.equal(gift.recommendations.some((item) => item.knowledgeReview), false);

  const snoozed = buildHomeViewModel(data({ people: [{ ...person, birthday: null }], memories: [memory("due", "likes", { snoozedUntil: "2026-09-01T00:00:00.000Z" })] }), "pl", t, now);
  assert.equal(snoozed.recommendations.some((item) => item.knowledgeReview), false);

  const conflict = buildHomeViewModel(data({ people: [{ ...person, birthday: null }], memories: [memory("yes", "likes"), memory("no", "dislikes")] }), "pl", t, now);
  assert.equal(conflict.recommendations.some((item) => item.knowledgeReview), false);
});

test("Home and voice knowledge review preferences operate independently", () => {
  const memory = {
    id: "due", personId: "p1", eventId: null, category: "preference", title: null, value: "Tea",
    occurredOn: null, createdAt: "2025-01-01T00:00:00.000Z", isActive: true,
    polarity: "likes", userConfirmed: true, confirmedAt: "2025-01-01T00:00:00.000Z",
    reviewedAt: null, snoozedUntil: null,
  };
  const base = { people: [{ id: "p1", name: "Ola", birthday: null, relationLabel: "Siostra" }], memories: [memory] };
  const now = new Date("2026-08-10T12:00:00.000Z");
  const homeOnly = buildHomeViewModel(data({ ...base, knowledgeReviewPreferences: { homeEnabled: true, voiceEnabled: false } }), "pl", t, now);
  assert.equal(homeOnly.recommendations.some((item) => item.knowledgeReview), true);
  assert.equal(homeOnly.assistantActions.briefing.sections.some((section) => section.kind === "knowledge-review-question"), false);

  const voiceOnly = buildHomeViewModel(data({ ...base, knowledgeReviewPreferences: { homeEnabled: false, voiceEnabled: true } }), "pl", t, now);
  assert.equal(voiceOnly.recommendations.some((item) => item.knowledgeReview), false);
  assert.equal(voiceOnly.assistantActions.briefing.sections.some((section) => section.kind === "knowledge-review-question"), true);

  const disabled = buildHomeViewModel(data({ ...base, knowledgeReviewPreferences: { homeEnabled: false, voiceEnabled: false } }), "pl", t, now);
  assert.equal(disabled.recommendations.some((item) => item.knowledgeReview), false);
  assert.equal(disabled.assistantActions.briefing.sections.some((section) => section.kind === "knowledge-review-question"), false);
});
