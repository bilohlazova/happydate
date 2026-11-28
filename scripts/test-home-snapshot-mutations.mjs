// Local source mutations of the home privacy layers, every file restored in finally; no production or database access.
import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = (p) => path.join(root, p);
const render = "src/lib/home/homeRender.ts";
const page = "src/components/HomePageClient.tsx";
const guard = "src/lib/home/useHomeRestoreGuard.ts";
const mutations = [
  ["selector: drop owner comparison", render, "|| snapshot.ownerId !== currentUserId", ""],
  ["page: bypass selector", page, "privateHidden ? null : selectRenderableHomeSnapshot(homeSnapshot, user?.id ?? null, authLoading);", "privateHidden ? null : (homeSnapshot?.viewModel ?? null); void selectRenderableHomeSnapshot;"],
  ["guard: keep DOM at pagehide", guard, 'flushSync(() => setStored({ ownerId: ownerId as string, value: "verifying" }));', "void 0;"],
  ["guard: accept stale verification", guard, "if (!mounted || run !== generation.current) return;\n        if (error", "if (!mounted) return;\n        if (error"],
  ["guard: skip owner comparison", guard, "data.user?.id === ownerId", "true"],
  ["guard: treat any error as verified", guard, "if (error && !sessionIsGone(error)) throw error;", "void 0;"],
  ["guard: never clear failed flag", guard, "      failed.current = false;\n", ""],
];
const originals = new Map();
let survived = 0;
try {
  for (const [name, rel, from, to] of mutations) {
    const target = file(rel);
    if (!originals.has(rel)) originals.set(rel, await readFile(target, "utf8"));
    const original = originals.get(rel);
    if (!original.includes(from)) throw new Error(`Mutation target missing: ${name}`);
    await writeFile(target, original.replace(from, to));
    const run = spawnSync(process.execPath, ["--experimental-strip-types", "--test", "--test-concurrency=1", "tests/home-snapshot-privacy.test.mjs"], { cwd: root, encoding: "utf8", timeout: 120000 });
    await writeFile(target, original);
    const log = run.stdout + run.stderr;
    const failures = log.match(/(?:ℹ|#) fail (\d+)/)?.[1];
    if (run.error || !failures || /Build failed|SyntaxError|ReferenceError/.test(log)) throw new Error(`Invalid mutation run: ${name}\n${log}`);
    const killed = run.status !== 0 && Number(failures) > 0;
    console.log(`${killed ? "KILLED" : "SURVIVED"}: ${name}; failed tests=${failures}`);
    if (!killed) survived++;
  }
} finally {
  for (const [rel, original] of originals) await writeFile(file(rel), original);
}
if (survived) process.exitCode = 1;
