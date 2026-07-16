import type { Metadata } from "next";

import type { AppLocale } from "./config";

const POLISH_FALLBACK = {
  title: "HappyDate",
  description: "Twój ciepły asystent prezentowy",
} as const;

/** Phase 1 fallback; later phases can provide locale-specific metadata here. */
export function getAppMetadata(_locale: AppLocale): Metadata {
  return {
    ...POLISH_FALLBACK,
    openGraph: {
      title: POLISH_FALLBACK.title,
      description: POLISH_FALLBACK.description,
    },
  };
}
