import { spawnSync } from "node:child_process";
if (process.env.RUN_LOCAL_SUPABASE_RLS_TESTS !== "1" || process.env.RUN_LOCAL_SUPABASE_SCHEMA_TESTS !== "1") {
  console.error("Integration gate requires RUN_LOCAL_SUPABASE_RLS_TESTS=1 and RUN_LOCAL_SUPABASE_SCHEMA_TESTS=1 with an isolated local Supabase container.");
  process.exit(1);
}
const result = spawnSync(process.execPath, ["--experimental-strip-types", "--test", "tests/local-rls-owner-isolation.test.mjs", "tests/local-runtime-schema-contract.test.mjs"], { stdio: "inherit" });
process.exit(result.status ?? 1);
