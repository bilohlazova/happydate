export type AuthErrorKey =
  | "invalidCredentials"
  | "emailAlreadyRegistered"
  | "emailNotConfirmed"
  | "rateLimited"
  | "network"
  | "unauthorized"
  | "expiredLink"
  | "generic";

type AuthErrorLike = { message?: unknown; code?: unknown; status?: unknown };

export function mapAuthError(error: unknown): AuthErrorKey {
  const candidate = error && typeof error === "object" ? error as AuthErrorLike : {};
  const message = typeof candidate.message === "string" ? candidate.message.toLowerCase() : "";
  const code = typeof candidate.code === "string" ? candidate.code.toLowerCase() : "";
  const status = typeof candidate.status === "number" ? candidate.status : null;
  const content = `${code} ${message}`;

  if (content.includes("invalid login credentials") || content.includes("invalid_credentials")) return "invalidCredentials";
  if (content.includes("already registered") || content.includes("user_already_exists")) return "emailAlreadyRegistered";
  if (content.includes("email not confirmed") || content.includes("email_not_confirmed")) return "emailNotConfirmed";
  if (status === 429 || content.includes("rate limit") || content.includes("over_request_rate_limit")) return "rateLimited";
  if (content.includes("failed to fetch") || content.includes("network") || content.includes("fetch failed")) return "network";
  if (content.includes("expired") || content.includes("invalid token") || content.includes("otp_expired")) return "expiredLink";
  if (status === 401 || content.includes("unauthorized") || content.includes("not authenticated")) return "unauthorized";
  return "generic";
}
