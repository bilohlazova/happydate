import type { Metadata } from "next";
import ReviewsClient from "./ReviewsClient";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("static.reviews");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: "/reviews" },
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      type: "website",
    },
  };
}

export default function Page() {
  return <ReviewsClient />;
}
