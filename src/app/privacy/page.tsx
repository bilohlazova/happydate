import type { Metadata } from "next";
import { getMessages, getTranslations } from "next-intl/server";

import LegalDocument from "@/components/static/LegalDocument";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("static.legal.privacy");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function PrivacyPolicy() {
  const messages = await getMessages();
  const legal = messages.static.legal;

  return (
    <LegalDocument
      title={legal.privacy.title}
      effective={legal.common.effective}
      sections={legal.privacy.sections}
    />
  );
}
