import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

const scopedReactFiles = [
  "src/app/services/wiadomosc-z-nieba/page.tsx",
  "src/app/services/wiadomosc-grupowa/page.tsx",
  "src/app/services/podaruj-dobro/page.tsx",
  "src/app/services/wysluchaj-mnie/page.tsx",
  "src/app/services/zrzutka/page.tsx",
  "src/components/services/ServiceCard.tsx",
  "src/components/services/GoodDeedForm.tsx",
  "src/components/services/GoodDeedSteps.tsx",
  "src/components/services/YouTubeShowcase.tsx",
  "src/components/AIAssistant.tsx",
  "src/components/assistant/AssistantAvatar.tsx",
  "src/components/assistant/AssistantCard.tsx",
  "src/components/assistant/AssistantMessage.tsx",
  "src/components/assistant/AssistantVoiceButton.tsx",
  "src/components/assistant/SuggestionCard.tsx",
  "src/components/home/MoodSelector.tsx",
];

test("Phase 3C scoped production React files contain no known hardcoded Polish UI copy", async () => {
  const forbidden = [
    "Wiadomość z Nieba",
    "Wiadomość od Grupy",
    "Zamów wiadomość",
    "Zamów wideo",
    "Wróć do Usługi",
    "Jak to działa?",
    "Najczęstsze pytania",
    "Podaruj Dobro",
    "Wybierz kierunek",
    "Miasto",
    "Godzina",
    "Wiadomość (opcjonalnie)",
    "Wyślij zgłoszenie",
    "Wysłuchaj mnie",
    "Cennik i vouchery",
    "Kup voucher",
    "Utwórz zrzutkę",
    "Zebrano",
    "Uczestnicy",
    "Przejrzyste opłaty",
    "Dowiedz się więcej",
    "Dzień dobry",
    "Dobry dzień",
    "Dobry wieczór",
    "Dobranoc",
    "Zatrzymaj",
    "Posłuchaj",
    "Słucham…",
    "Porozmawiaj ze mną",
    "Zacznij od dodania pierwszej ważnej osoby.",
    "Dziś spokojny dzień.",
    "Wszystko masz pod kontrolą.",
    "Nie zostawiaj tego na ostatnią chwilę",
  ];

  for (const file of scopedReactFiles) {
    const source = await readFile(path.join(root, file), "utf8");
    for (const copy of forbidden) {
      assert.equal(source.includes(copy), false, `${file}: ${copy}`);
    }
  }
});

test("service plan route keeps canonical values while presentation copy is localized", async () => {
  const [data, page] = await Promise.all([
    readFile(
      path.join(
        root,
        "src/app/services/wiadomosc-z-nieba/plans/data.ts"
      ),
      "utf8"
    ),
    readFile(
      path.join(
        root,
        "src/app/services/wiadomosc-z-nieba/plans/[slug]/page.tsx"
      ),
      "utf8"
    ),
  ]);

  for (const value of [
    "list_cyfrowy",
    "list_drukowany",
    "video_cyfrowe",
    "video_premium",
  ]) {
    assert.match(data, new RegExp(`type: "${value}"`));
  }

  assert.doesNotMatch(data, /List cyfrowy|Wideo premium|Dostawa kurierem/);
  assert.equal(page.includes("plans.${plan.type}.name"), true);
  assert.equal(page.includes("order?plan=${plan.type}"), true);
});

test("legal routes render from localized structured content", async () => {
  for (const file of [
    "src/app/privacy/page.tsx",
    "src/app/regulamin/page.tsx",
    "src/app/regulamin-zwrotow/page.tsx",
  ]) {
    const source = await readFile(path.join(root, file), "utf8");
    assert.match(source, /getMessages/);
    assert.match(source, /LegalDocument/);
    assert.doesNotMatch(source, /Obowiązuje od|Postanowienia ogólne|Administrator danych/);
  }
});
