import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "HappyDate",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ slug: string }> };

/** Old plan links remain recoverable, but plans and prices are not public. */
export default async function HeavenPlanPage({ params }: Props) {
  await params;
  redirect("/services/wiadomosc-z-nieba");
}
