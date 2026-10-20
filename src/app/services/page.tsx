import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PremiumServices from "@/components/services/PremiumServices";

const getServicesTranslations = getTranslations as unknown as (namespace: string) => Promise<(key: string) => string>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServicesTranslations("services");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: true, follow: true },
    alternates: { canonical: "/services" },
  };
}

export default async function ServicesPage() {
  return <PremiumServices />;
}
