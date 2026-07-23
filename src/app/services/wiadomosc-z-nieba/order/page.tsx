import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import OrderPageContent from "./OrderPageContent";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("static.services.phase3b.heaven.orderPage");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: "/services/wiadomosc-z-nieba/order" },
  };
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <OrderPageContent />
    </Suspense>
  );
}
