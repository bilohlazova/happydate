export type AssistantEnvironmentStatus = {
  openAiConfigured: boolean;
  upstashConfigured: boolean;
  productionReady: boolean;
};

export type AssistantConfigurationCategory =
  | "openai_key_missing"
  | "upstash_url_missing"
  | "upstash_token_missing";

type AssistantEnvironment = Partial<Record<
  "OPENAI_API_KEY" | "UPSTASH_REDIS_REST_URL" | "UPSTASH_REDIS_REST_TOKEN",
  string | undefined
>>;

function isConfigured(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

export function getAssistantEnvironmentStatus(
  environment: AssistantEnvironment = process.env as AssistantEnvironment,
): AssistantEnvironmentStatus {
  const openAiConfigured = isConfigured(environment.OPENAI_API_KEY);
  const upstashConfigured = isConfigured(environment.UPSTASH_REDIS_REST_URL)
    && isConfigured(environment.UPSTASH_REDIS_REST_TOKEN);
  return {
    openAiConfigured,
    upstashConfigured,
    productionReady: openAiConfigured && upstashConfigured,
  };
}

export function getMissingAssistantConfiguration(
  environment: AssistantEnvironment = process.env as AssistantEnvironment,
): AssistantConfigurationCategory[] {
  const missing: AssistantConfigurationCategory[] = [];
  if (!isConfigured(environment.OPENAI_API_KEY)) missing.push("openai_key_missing");
  if (!isConfigured(environment.UPSTASH_REDIS_REST_URL)) missing.push("upstash_url_missing");
  if (!isConfigured(environment.UPSTASH_REDIS_REST_TOKEN)) missing.push("upstash_token_missing");
  return missing;
}
