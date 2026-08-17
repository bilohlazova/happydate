import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const order = new URL("../src/app/services/wiadomosc-z-nieba/order/page.tsx", import.meta.url);
const plan = new URL("../src/app/services/wiadomosc-z-nieba/plans/[slug]/page.tsx", import.meta.url);

test("legacy heaven order and plan routes redirect to the honest preview", async () => {
  for (const file of [order, plan]) {
    const source = await readFile(file, "utf8");
    assert.match(source, /redirect\("\/services\/wiadomosc-z-nieba"\)/);
    assert.match(source, /index: false/);
  }
});

test("legacy heaven routes expose no price or checkout UI", async () => {
  const source = `${await readFile(order, "utf8")}\n${await readFile(plan, "utf8")}`;
  assert.doesNotMatch(source, /plan\.price|OrderPageContent|orderPlan|proceed|pricing/);
});
