import type { AppLocale } from "./config";

export function formatFriendlyFirstName(firstName: string | null | undefined, locale: AppLocale): string | null {
  const name = firstName?.replace(/\s+/g, " ").trim();
  if (!name) return null;
  // -ія → -іє is a stable Ukrainian vocative pattern (Марія → Маріє,
  // Софія → Софіє). Other names stay untouched instead of guessing.
  if (locale === "uk" && /ія$/iu.test(name)) return name.replace(/ія$/iu, "іє");
  return name;
}

