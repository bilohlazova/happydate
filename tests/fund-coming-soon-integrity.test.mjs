import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const page = new URL("../src/app/services/zrzutka/page.tsx", import.meta.url);
test("fund page cannot simulate or start a real collection", async()=>{const s=await readFile(page,"utf8");assert.match(s,/ComingSoonNotice/);assert.doesNotMatch(s,/useState|onClick|flow=zrzutka|2–4%|0 zł/)});
test("fund preview states the financial safety boundary", async()=>{const s=await readFile(page,"utf8");assert.match(s,/не приймає внески/);assert.match(s,/Ліцензованого платіжного партнера/);assert.match(s,/Повернення й вирішення спорів/)});
