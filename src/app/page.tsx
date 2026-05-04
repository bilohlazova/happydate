// src/app/page.tsx
// Простий wrapper — вся логіка в HomePageClient

import HomePageClient from "@/components/HomePageClient";

const OPINIONS = [
  { text: "Pierwszy raz miałem wrażenie, że ktoś naprawdę ogarnia za mnie ważne sprawy.", author: "Adam" },
  { text: "Nie zapomniałam o niczym w tym roku. To ogromna ulga.", author: "Kasia" },
  { text: "To nie jest aplikacja. To spokój w głowie.", author: "Ola" },
];

export default function HomePage() {
  return <HomePageClient opinions={OPINIONS} />;
}