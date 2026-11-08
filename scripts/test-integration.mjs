import { spawnSync } from "node:child_process";
if (process.env.RUN_LOCAL_SUPABASE_RLS_TESTS !== "1" || process.env.RUN_LOCAL_SUPABASE_SCHEMA_TESTS !== "1") {
  console.error("Integration gate requires RUN_LOCAL_SUPABASE_RLS_TESTS=1 and RUN_LOCAL_SUPABASE_SCHEMA_TESTS=1 with an isolated local Supabase container.");
  process.exit(1);
}
// Files share one local database. Keep the CLI aligned with the CI lock boundary.
const result = spawnSync(process.execPath, ["--experimental-strip-types", "--test", "--test-concurrency=1", "tests/local-rls-owner-isolation.test.mjs", "tests/local-runtime-schema-contract.test.mjs", "tests/staging-release-repair.test.mjs"], { stdio: "inherit" });
process.exit(result.status ?? 1);
