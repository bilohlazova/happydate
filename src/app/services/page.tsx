import type { Metadata } from "next";
import Link from "next/link";
import { ServiceSection } from "@/components/services/ServiceSection";
import { ServiceCard } from "@/components/services/ServiceCard";

export const metadata: Metadata = {
  title: "HappyDate – Jak pomagamy dbać o relacje",
  description:
    "HappyDate Care i rytuały online. Pamięć, emocje i wsparcie — bez fizycznych produktów.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <main className="overflow-x-hidden bg-white">

      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden bg-gradient-to-r from-pink-100 via-yellow-100 to-blue-100 py-12 md:py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="mb-4 text-3xl font-extrabold md:text-5xl">
            Jedna usługa. <br className="hidden sm:block" />
            Wiele spokojnych chwil.
          </h1>

          <p className="mb-6 text-gray-700 md:text-lg">
            HappyDate to online-serwis, który pamięta za Ciebie o ważnych osobach,
            datach i emocjach — żebyś mógł być bliżej, bez stresu i zapominania.
          </p>

          <a
            href="#happydate-care"
            className="inline-block rounded-full bg-pink-500 px-6 py-3 font-semibold text-white shadow hover:bg-pink-600 transition"
          >
            Zobacz, jak działa HappyDate Care ↓
          </a>
        </div>
      </section>

      {/* ================= HAPPYDATE CARE ================= */}
      <section
        id="happydate-care"
        className="py-14 md:py-16 bg-white"
      >
        <div className="mx-auto max-w-4xl px-4 text-center">

          <div className="mx-auto mb-6 h-1 w-20 rounded-full bg-gradient-to-r from-pink-400 to-yellow-400" />

          <h2 className="mb-3 text-2xl font-bold md:text-3xl">
            💛 HappyDate Care
          </h2>

          <p className="mb-8 text-gray-700">
            To serce HappyDate. Subskrypcja, która przejmuje pamiętanie,
            porządkowanie i delikatne przypominanie — za Ciebie.
          </p>

          <div className="grid gap-4 sm:grid-cols-3 mb-8">
            <div className="rounded-xl bg-gray-100 p-4 text-sm font-medium">
              📅 Ważne daty i osoby
            </div>
            <div className="rounded-xl bg-gray-100 p-4 text-sm font-medium">
              📝 Notatki, marzenia i preferencje
            </div>
            <div className="rounded-xl bg-gray-100 p-4 text-sm font-medium">
              🔔 Przypomnienia i podpowiedzi AI
            </div>
          </div>

          <p className="mb-6 text-base font-semibold">
            od 29 zł / miesiąc <span className="font-normal">lub taniej w planie rocznym</span>
          </p>

          <Link
            href="/care"
            className="inline-block rounded-full bg-pink-500 px-8 py-3 font-semibold text-white shadow hover:bg-pink-600 transition"
          >
            Zobacz HappyDate Care
          </Link>
        </div>
      </section>

      {/* ================= DODATKOWE RYTUAŁY ================= */}
      <ServiceSection
        emoji="❤️"
        title="Dodatkowe rytuały online"
        intro="Gdy sama pamięć to za mało — te usługi pomagają wyrazić emocje i być bliżej."
        gradient="pink"
      >
        <ServiceCard
          emoji="💬"
          title="Wysłuchaj mnie"
          description="Anonimowa rozmowa z kimś, kto naprawdę słucha. Bez ocen i bez presji."
          href="/services/wysluchaj-mnie"
          accent="blue"
        />

        <ServiceCard
          emoji="🌙"
          title="Wiadomość z Nieba"
          description="Słowa, których nigdy nie udało się wypowiedzieć — w bezpiecznej formie."
          href="/services/wiadomosc-z-nieba"
          accent="indigo"
        />

        <ServiceCard
          emoji="🎥"
          title="Wiadomość od Grupy"
          description="Jedna wiadomość stworzona z głosów wielu bliskich osób."
          href="/services/wiadomosc-grupowa"
          accent="blue"
        />

        <ServiceCard
          emoji="💸"
          title="Zrzutka"
          description="Wspólny gest i emocje — bez produktów i logistyki."
          href="/services/zrzutka"
          accent="green"
        />

        <ServiceCard
          emoji="🕊️"
          title="Podaruj Dobro"
          description="Zrób coś dobrego dla innych i dla siebie — bez kupowania rzeczy."
          href="/services/podaruj-dobro"
          accent="pink"
        />
      </ServiceSection>

    </main>
  );
}
