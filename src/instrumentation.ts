import { assertEnvironmentSafety } from "./lib/supabase/environmentSafety";

export function register() {
  assertEnvironmentSafety(process.env);
}
