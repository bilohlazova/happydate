import type { Metadata } from "next";
import HeroWiadomosc from "./components/HeroWiadomosc";
import HowItWorks from "./components/HowItWorks";
import PricingWiadomosc from "./components/PricingWiadomosc";
import TrustSecurity from "./components/TrustSecurity";
import FAQWiadomosc from "./components/FAQWiadomosc";
import Stars from "./components/Stars";

export const metadata: Metadata = {
  title: "HappyDate – Wiadomość z Nieba",
  description:
    "Zostaw list lub wideo dla bliskiej osoby – my bezpiecznie przechowamy i dostarczymy je w wybranym dniu.",
  alternates: { canonical: "/services/wiadomosc-z-nieba" },
  openGraph: {
    title: "HappyDate – Wiadomość z Nieba",
    description:
      "Twoje słowa mogą dotrzeć nawet wtedy, gdy Ciebie już nie będzie.",
    type: "website",
    url: "https://happydate.pl/services/wiadomosc-z-nieba",
  },
  twitter: { card: "summary_large_image" },
};

export default function WiadomoscZNiebaPage() {
  return (
    <main className="relative overflow-hidden">
      {/* PASTELOWE NIEBO – jasne, spójne z innymi usługami */}
      <div className="absolute inset-0 -z-30 bg-gradient-to-b from-[#e9f6ff] via-[#eef3ff] to-[#f6f1ff]" />

      {/* lekki „glow” pod headerem, żeby przejście było miękkie */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 -z-20 bg-gradient-to-b from-white/60 via-white/30 to-transparent" />

      {/* delikatne gwiazdki */}
      <div className="absolute inset-0 -z-10 opacity-20" suppressHydrationWarning>
        <Stars />
      </div>

      {/* lekka mgiełka przy dole hero (jasna) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[-8%] -z-10 h-[55%] rounded-t-[100%] bg-gradient-to-t from-[#efe9ff] via-transparent to-transparent blur-2xl" />

      {/* Sekcje */}
      <HeroWiadomosc />
      <HowItWorks />
      <PricingWiadomosc />
      <TrustSecurity />
      <FAQWiadomosc />
    </main>
  );
}

