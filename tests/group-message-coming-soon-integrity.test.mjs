import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const pagePath = new URL("../src/app/services/wiadomosc-grupowa/page.tsx", import.meta.url);

test("group message is presented as unavailable, not as a purchasable service", async () => {
  const source = await readFile(pagePath, "utf8");
  assert.match(source, /ComingSoonNotice/);
  assert.doesNotMatch(source, /79 zł|149 zł|279 zł|orderPackage|flow=group-message/);
});

test("group message preview explains consent, privacy and retention", async () => {
  const source = await readFile(pagePath, "utf8");
  assert.match(source, /згода кожного учасника/);
  assert.match(source, /приватний доступ/);
  assert.match(source, /строк зберігання/);
});
