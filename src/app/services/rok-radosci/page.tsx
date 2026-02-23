// src/app/services/rok-radosci/page.tsx
import type { Metadata } from "next";
import RokPlans from "./_components/RokPlans";
import RokFAQ from "./_components/RokFAQ";

export const metadata: Metadata = {
  title: "HappyDate – Rok Radości",
  description:
    "Rok Radości – subskrypcja przypomnień i pomysłów na prezenty. Planer (19 zł/mies.) i Concierge (49 zł/mies.) – 12 miesięcy spokoju i trafionych niespodzianek.",
  alternates: { canonical: "/services/rok-radosci" },
  openGraph: {
    title: "HappyDate – Rok Radości",
    description:
      "Jedna decyzja – dwanaście niespodzianek. AI + doradca człowiek, przypomnienia i pomysły na prezenty bez stresu.",
    type: "website",
    url: "https://happydate.pl/services/rok-radosci",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default function Page() {
  return (
    <main className="bg-white dark:bg-gray-900">
      {/* Hero + Jak to działa + Plany i ceny */}
      <RokPlans />

      {/* Tylko FAQ na końcu */}
      <RokFAQ />
    </main>
  );
}
