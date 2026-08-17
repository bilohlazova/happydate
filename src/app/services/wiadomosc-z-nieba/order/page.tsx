import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "HappyDate",
  robots: { index: false, follow: false },
};

/**
 * Orders are intentionally unavailable while Message from Heaven remains a
 * future service. Keeping this redirect protects old bookmarks and shared
 * links without exposing an inactive checkout form.
 */
export default function HeavenOrderPage() {
  redirect("/services/wiadomosc-z-nieba");
}
