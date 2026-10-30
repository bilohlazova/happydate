import { assertEnvironmentSafety } from "./lib/supabase/environmentSafety.ts";
import { logPr14RuntimeSafetyPass } from "./lib/observability/safeLogger.ts";
import { shouldLogPr14RuntimeSafety } from "./lib/supabase/runtimeSafetyLog.ts";

export function register() {
  const status = assertEnvironmentSafety(process.env);
  if (shouldLogPr14RuntimeSafety(status, process.env)) logPr14RuntimeSafetyPass();
}
