import type { Metadata } from "next";
import HeroWiadomosc from "./components/HeroWiadomosc";
import HowItWorks from "./components/HowItWorks";
import PricingWiadomosc from "./components/PricingWiadomosc";
import TrustSecurity from "./components/TrustSecurity";
import FAQWiadomosc from "./components/FAQWiadomosc";
import Stars from "./components/Stars";

export const metadata: Metadata = {
  title: "HappyDate – Wiadomość z Nieba",
  description: "Zostaw list lub wideo dla bliskiej osoby – bezpiecznie przechowamy i dostarczymy w wybranym dniu.",
  alternates: { canonical: "/services/wiadomosc-z-nieba" },
  openGraph: {
    title: "HappyDate – Wiadomość z Nieba",
    description: "Twoje słowa mogą dotrzeć nawet po latach.",
    type: "website",
    url: "https://happydate.pl/services/wiadomosc-z-nieba",
  },
  twitter: { card: "summary_large_image" },
};

export default function WiadomoscZNiebaPage() {
  return (
    <main className="relative overflow-hidden">
      {/* Фірмовий блакитний фон */}
      <div className="absolute inset-0 -z-30 bg-gradient-to-b from-[#e0f2fe] via-[#f0f9ff] to-[#f8faff]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 -z-20 bg-gradient-to-b from-white/50 via-white/20 to-transparent" />

      {/* Зірки */}
      <div className="absolute inset-0 -z-10 opacity-15" suppressHydrationWarning>
        <Stars />
      </div>

      <HeroWiadomosc />
      <HowItWorks />
      <PricingWiadomosc />
      <TrustSecurity />
      <FAQWiadomosc />
    </main>
  );
}