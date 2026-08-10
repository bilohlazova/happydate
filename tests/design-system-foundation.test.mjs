import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("shared design foundation defines intentional light page primitives", async () => {
  const css = await source("src/app/globals.css");
  assert.match(css, /color-scheme:\s*light/);
  assert.match(css, /\.hd-page-shell\s*\{/);
  assert.match(css, /\.hd-page-card\s*\{/);
  assert.match(css, /\.hd-settings-row\s*\{/);
  assert.doesNotMatch(css, /prefers-color-scheme:\s*dark/);
});

test("settings routes use the shared accessible page shell", async () => {
  const shell = await source("src/components/ui/SettingsPageShell.tsx");
  const reminders = await source("src/app/(app)/settings/reminders/page.tsx");
  const accountExport = await source("src/app/(app)/settings/export/page.tsx");

  assert.match(shell, /<main className="hd-page-shell">/);
  assert.match(shell, /<h1>\{title\}<\/h1>/);
  assert.match(reminders, /<SettingsPageShell/);
  assert.match(accountExport, /<SettingsPageShell/);
});
