import type { Metadata } from "next";

import type { AppLocale } from "./config";

const APP_METADATA: Record<AppLocale, { title: string; description: string }> = {
  pl: {
    title: "HappyDate",
    description: "Osobisty asystent AI, który pomaga troszczyć się o bliskich.",
  },
  uk: {
    title: "HappyDate",
    description: "Персональний AI-асистент, який допомагає піклуватися про близьких.",
  },
  en: {
    title: "HappyDate",
    description: "A personal AI care assistant for the people you love.",
  },
  de: {
    title: "HappyDate",
    description: "Dein persönlicher KI-Assistent, der dich dabei unterstützt, für deine Liebsten da zu sein.",
  },
  ru: {
    title: "HappyDate",
    description: "Персональный AI-ассистент, который помогает заботиться о близких.",
  },
};

export function getAppMetadata(locale: AppLocale): Metadata {
  const metadata = APP_METADATA[locale];

  return {
    ...metadata,
    openGraph: {
      title: metadata.title,
      description: metadata.description,
    },
  };
}
