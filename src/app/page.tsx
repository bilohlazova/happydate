// src/app/page.tsx
// Server-compatible wrapper — вся логіка в HomePageClient

import HomePageClient from "@/components/HomePageClient";

export default function HomePage() {
  return <HomePageClient />;
}