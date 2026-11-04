import { spawnSync } from "node:child_process";
const files = process.argv.slice(2);
if (!files.length || files.some(file => !/^tests\/[\w./-]+\.test\.mjs$/.test(file))) {
  console.error("Usage: npm run test:fast -- tests/changed-module.test.mjs [...]");
  process.exit(1);
}
const result = spawnSync(process.execPath, ["--experimental-strip-types", "--test", ...files], { stdio: "inherit" });
process.exit(result.status ?? 1);
