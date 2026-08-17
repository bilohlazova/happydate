import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";

const retired = [
  "../src/components/services/GoodDeedForm.tsx",
  "../src/components/services/YouTubeShowcase.tsx",
  "../src/components/services/GoodDeedSteps.tsx",
  "../src/app/services/wiadomosc-z-nieba/order/OrderPageContent.tsx",
  "../src/app/services/wiadomosc-z-nieba/components/OrderForm.tsx",
  "../src/app/services/wiadomosc-z-nieba/plans/data.ts",
];

test("retired future-service forms and price catalogue remain absent", async () => {
  for (const path of retired) {
    await assert.rejects(access(new URL(path, import.meta.url), constants.F_OK));
  }
});

test("future-service pages do not reference retired operational modules", async () => {
  const pages = ["podaruj-dobro/page.tsx", "wiadomosc-z-nieba/page.tsx", "wiadomosc-z-nieba/order/page.tsx", "wiadomosc-z-nieba/plans/[slug]/page.tsx"];
  const source = (await Promise.all(pages.map(path => readFile(new URL(`../src/app/services/${path}`, import.meta.url), "utf8")))).join("\n");
  assert.doesNotMatch(source, /GoodDeedForm|YouTubeShowcase|OrderPageContent|OrderForm|plans\/data|plan\.price/);
});
