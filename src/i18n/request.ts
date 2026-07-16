import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import {
  LOCALE_COOKIE_NAME,
  normalizeLocale,
  resolveRequestLocale,
} from "./config";
import { loadMessages } from "./messages";

export default getRequestConfig(async ({ locale: explicitLocale }) => {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const locale =
    normalizeLocale(explicitLocale) ??
    resolveRequestLocale(
      cookieStore.get(LOCALE_COOKIE_NAME)?.value,
      headerStore.get("accept-language"),
    );

  return {
    locale,
    messages: await loadMessages(locale),
    // Stable Phase 1 default; user timezone persistence is a later concern.
    timeZone: "UTC",
    onError(error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[i18n] Translation error:", error);
      }
    },
    getMessageFallback({ namespace, key }) {
      return [namespace, key].filter(Boolean).join(".");
    },
  };
});
