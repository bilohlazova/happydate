import type { Metadata } from "next";
import { getMessages, getTranslations } from "next-intl/server";

import LegalDocument from "@/components/static/LegalDocument";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("static.legal.returns");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function RegulaminZwrotow() {
  const messages = await getMessages();
  const legal = messages.static.legal;

  return (
    <LegalDocument
      title={legal.returns.title}
      effective={legal.common.effective}
      sections={legal.returns.sections}
    />
  );
}
