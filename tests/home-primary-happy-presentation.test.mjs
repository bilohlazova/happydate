import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const { buildHomePrimaryHappyPresentation } = await import("../src/lib/happy/home/buildHomePrimaryHappyPresentation.ts");
const owner = "00000000-0000-4000-8000-000000000001";
const person = "00000000-0000-4000-8000-000000000002";
const other = "00000000-0000-4000-8000-000000000003";
const event = "00000000-0000-4000-8000-000000000004";
const base = {
  isAuthenticated: true, userId: owner, profile: null, authMetadataName: null, email: null, errors: [], pendingGiftOutcomes: [], knowledgeReviewPreferences: { homeEnabled: true, voiceEnabled: true },
  people: [{ id: person, name: "Mia", birthday: "1990-10-07", birthYear: null, relationLabel: null, relationKey: null, gender: null }],
  events: [{ id: event, title: "Mia birthday", date: "2026-10-07", category: "birthday", notes: null, personId: person }],
  memories: [],
};
const idea = (type = "gift_help") => ({ type: "idea", priority: "high", idea: { id: "00000000-0000-4000-8000-000000000005", userId: owner, type, title: "internal title", message: "internal message", status: "new", personId: person, eventId: event, createdAt: "2026-10-01T00:00:00.000Z" }, block: { type: "idea", ideaId: "00000000-0000-4000-8000-000000000005", title: "internal title", message: "internal message", actions: ["accept", "dismiss"] } });
const translate = (locale = "en") => (key, values = {}) => {
  const labels = {
    "countdown.today": { uk: "сьогодні", pl: "dzisiaj", en: "today", de: "heute", ru: "сегодня" },
    "countdown.tomorrow": { uk: "завтра", pl: "jutro", en: "tomorrow", de: "morgen", ru: "завтра" },
    "countdown.days": { uk: `через ${values.count} днів`, pl: `za ${values.count} dni`, en: `in ${values.count} days`, de: `in ${values.count} Tagen`, ru: `через ${values.count} дней` },
    "events.birthdayTitle": { uk: `День народження: ${values.name}`, pl: `Urodziny: ${values.name}`, en: `Birthday: ${values.name}`, de: `Geburtstag: ${values.name}`, ru: `День рождения: ${values.name}` },
    "events.turningAge": { uk: `Виповниться ${values.age} років`, pl: `Skończy ${values.age} lat`, en: `Will turn ${values.age}`, de: `Wird ${values.age} Jahre alt`, ru: `Исполнится ${values.age} лет` },
    "happyTask.title": { uk: `День народження ${values.name}`, pl: `Urodziny: ${values.name}`, en: `Birthday for ${values.name}`, de: `Geburtstag von ${values.name}`, ru: `День рождения ${values.name}` },
    "happyTask.progress": { uk: `${values.completed} з ${values.total} готово`, pl: `${values.completed} z ${values.total} gotowe`, en: `${values.completed} of ${values.total} complete`, de: `${values.completed} von ${values.total} fertig`, ru: `${values.completed} из ${values.total} готово` },
    "primaryHappy.eyebrow": { uk: "Happy", pl: "Happy", en: "Happy", de: "Happy", ru: "Happy" },
    "primaryHappy.generalTitle": { uk: "Пропозиція від Happy", pl: "Propozycja od Happy", en: "A suggestion from Happy", de: "Ein Vorschlag von Happy", ru: "Предложение от Happy" },
    "primaryHappy.status.giftUnresolved": { uk: "Подарунок ще не обраний.", pl: "Prezent nie został jeszcze wybrany.", en: "A gift has not been chosen yet.", de: "Ein Geschenk wurde noch nicht ausgewählt.", ru: "Подарок ещё не выбран." },
    "primaryHappy.status.prepareGreeting": { uk: "Подарунок готовий — час підготувати привітання.", pl: "Prezent jest gotowy — pora przygotować życzenia.", en: "The gift is ready — it is time to prepare a greeting.", de: "Das Geschenk ist bereit — jetzt kannst du einen Gruß vorbereiten.", ru: "Подарок готов — пора подготовить поздравление." },
    "primaryHappy.status.taskWaiting": { uk: "Happy чекає на твій вибір.", pl: "Happy czeka na Twój wybór.", en: "Happy is waiting for your choice.", de: "Happy wartet auf deine Auswahl.", ru: "Happy ждёт вашего выбора." },
    "primaryHappy.status.idea": { uk: "Є корисна пропозиція для тебе.", pl: "Jest dla Ciebie pomocna propozycja.", en: "There is a useful suggestion for you.", de: "Es gibt einen hilfreichen Vorschlag für dich.", ru: "Для вас есть полезное предложение." },
    "primaryHappy.context.preference": { uk: `Я пам’ятаю: ${values.value}`, pl: `Pamiętam: ${values.value}`, en: `I remember: ${values.value}`, de: `Ich erinnere mich: ${values.value}`, ru: `Я помню: ${values.value}` },
    "primaryHappy.actions.startGiftPlanning": { uk: "Почати підготовку", pl: "Rozpocznij przygotowania", en: "Start preparing", de: "Vorbereitung beginnen", ru: "Начать подготовку" },
    "primaryHappy.actions.giftHelp": { uk: "Підібрати подарунок", pl: "Znajdź prezent", en: "Find a gift", de: "Geschenk finden", ru: "Подобрать подарок" },
    "primaryHappy.actions.prepareGreeting": { uk: "Підготувати привітання", pl: "Przygotuj życzenia", en: "Prepare a greeting", de: "Gruß vorbereiten", ru: "Подготовить поздравление" },
    "primaryHappy.actions.continue": { uk: "Продовжити", pl: "Kontynuuj", en: "Continue", de: "Fortsetzen", ru: "Продолжить" },
    "primaryHappy.actions.reviewIdea": { uk: "Переглянути пропозицію", pl: "Zobacz propozycję", en: "Review suggestion", de: "Vorschlag ansehen", ru: "Посмотреть предложение" },
    "primaryHappy.idea.dismiss": { uk: "Відхилити", pl: "Odrzuć", en: "Dismiss", de: "Ablehnen", ru: "Отклонить" },
    "primaryHappy.idea.error": { uk: "Помилка", pl: "Błąd", en: "Error", de: "Fehler", ru: "Ошибка" },
    "primaryHappy.approval.title": { uk: "Потрібне підтвердження", pl: "Wymagane potwierdzenie", en: "Approval needed", de: "Bestätigung erforderlich", ru: "Нужно подтверждение" },
    "primaryHappy.approval.actions.save_gift": { uk: "Зберегти подарунок", pl: "Zapisz prezent", en: "Save gift", de: "Geschenk speichern", ru: "Сохранить подарок" },
  };
  return labels[key]?.[locale] ?? key;
};

test("birthday gift-help presentation uses event title, localized relative date, human state, and one primary CTA", () => {
  const presentation = buildHomePrimaryHappyPresentation(idea(), base, new Date("2026-10-01T12:00:00Z"), translate("uk"));
  assert.equal(presentation?.title, "День народження: Mia");
  assert.equal(presentation?.timing, "через 6 днів");
  assert.equal(presentation?.turningAgeLabel, "Виповниться 36 років");
  assert.equal(presentation?.statusText, "Подарунок ще не обраний.");
  assert.deepEqual(presentation?.primaryAction, { kind: "accept_idea", label: "Підібрати подарунок" });
  assert.equal(presentation?.secondaryAction?.kind, "dismiss_idea");
});

test("only a confirmed canonical preference for the primary person becomes grounded context", () => {
  const data = { ...base, memories: [
    { id: "00000000-0000-4000-8000-000000000006", personId: person, eventId: event, category: "preference", value: "кераміка", title: null, occurredOn: null, createdAt: "2026-09-01", isActive: true, userConfirmed: true },
    { id: "00000000-0000-4000-8000-000000000007", personId: other, eventId: event, category: "preference", value: "скелелазіння", title: null, occurredOn: null, createdAt: "2026-09-01", isActive: true, userConfirmed: true },
    { id: "00000000-0000-4000-8000-000000000008", personId: person, eventId: event, category: "memory", value: "Happy interpretation", title: null, occurredOn: null, createdAt: "2026-09-01", isActive: true },
  ] };
  const presentation = buildHomePrimaryHappyPresentation(idea(), data, new Date("2026-10-01T12:00:00Z"), translate("uk"));
  assert.deepEqual(presentation?.context, { text: "Я пам’ятаю: кераміка", source: { type: "knowledge", id: "00000000-0000-4000-8000-000000000006" } });
  assert.doesNotMatch(JSON.stringify(presentation), /скелелазіння|interpretation/i);
  assert.equal(buildHomePrimaryHappyPresentation(idea(), { ...base, memories: data.memories.slice(1) }, new Date("2026-10-01T12:00:00Z"), translate("uk"))?.context, null);
});

test("semantic CTA mappings, task summary, and no raw semantic or task implementation values", () => {
  const greeting = buildHomePrimaryHappyPresentation(idea("prepare_greeting"), base, new Date("2026-10-01T12:00:00Z"), translate());
  assert.equal(greeting?.primaryAction?.label, "Prepare a greeting");
  const task = { type: "task_progress", task: { id: "00000000-0000-4000-8000-000000000010", type: "birthday_preparation", title: "Mia", person: { id: person, name: "Mia" }, event: { id: event, date: "2026-10-07", daysUntil: 6 }, status: "waiting_user", progress: { completed: 2, total: 6 }, steps: [] }, block: { type: "task_progress" } };
  const presentation = buildHomePrimaryHappyPresentation(task, base, new Date("2026-10-01T12:00:00Z"), translate());
  assert.equal(presentation?.primaryAction?.label, "Continue");
  assert.equal(presentation?.statusText, "Happy is waiting for your choice.");
  assert.doesNotMatch(JSON.stringify(presentation), /gift_help|prepare_greeting|waiting_user|templateVersion|step_id/i);
});

test("all supported locales carry the primary presentation labels and localize relative dates", async () => {
  for (const locale of ["uk", "pl", "en", "de", "ru"]) {
    const messages = JSON.parse(await readFile(new URL(`../messages/${locale}/home.json`, import.meta.url), "utf8"));
    assert.ok(messages.primaryHappy?.actions?.giftHelp);
    assert.ok(messages.primaryHappy?.actions?.prepareGreeting);
    assert.ok(messages.primaryHappy?.context?.preference);
    assert.ok(messages.events?.turningAge);
    assert.ok(messages.wellbeing?.birthdayReturningIntroWithAge);
    assert.notEqual(buildHomePrimaryHappyPresentation(idea(), base, new Date("2026-10-01T12:00:00Z"), translate(locale))?.timing, "countdown.days");
  }
});

test("presentation preserves the single-card Home placement and has no AI/provider dependency", async () => {
  const dashboard = await readFile(new URL("../src/components/home-dashboard/HomeDashboard.tsx", import.meta.url), "utf8");
  const card = await readFile(new URL("../src/components/happy/HomePrimaryHappyBlock.tsx", import.meta.url), "utf8");
  const adapter = await readFile(new URL("../src/lib/happy/home/buildHomePrimaryHappyPresentation.ts", import.meta.url), "utf8");
  assert.equal((dashboard.match(/<HomePrimaryHappyBlock/g) ?? []).length, 1);
  assert.ok(dashboard.indexOf("<WellbeingCheckIn") < dashboard.indexOf("<HomePrimaryHappyBlock"));
  assert.ok(dashboard.indexOf("<HomePrimaryHappyBlock") < dashboard.indexOf("<UpcomingEventsSection"));
  assert.doesNotMatch(`${card}\n${adapter}`, /openai|provider|supabase|service_role/i);
  assert.match(card, /presentation\.turningAgeLabel/);
});
