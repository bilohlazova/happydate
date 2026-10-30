import { PR14_BRANCH, type EnvironmentSafetyStatus } from "./environmentSafety.ts";
export { PR14_RUNTIME_SAFETY_PASS } from "../observability/safeLogger.ts";

export function shouldLogPr14RuntimeSafety(
  status: EnvironmentSafetyStatus,
  env: Record<string, string | undefined>,
): boolean {
  return status === "pr14-preview-isolated"
    && env.VERCEL_ENV?.trim() === "preview"
    && env.VERCEL_GIT_COMMIT_REF?.trim() === PR14_BRANCH;
}
