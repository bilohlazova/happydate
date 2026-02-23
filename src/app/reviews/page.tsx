import type { Metadata } from "next";
import ReviewsClient from "./ReviewsClient";

export const metadata: Metadata = {
  title: "HappyDate – Opinie",
  description:
    "Opinie użytkowników HappyDate – prawdziwe historie i wrażenia z prezentów dostarczonych na czas.",
  alternates: { canonical: "/reviews" },
  openGraph: {
    title: "HappyDate – Opinie",
    description:
      "Zobacz, co mówią o nas użytkownicy. Ciepłe historie i uśmiechy, które zostają na długo.",
    type: "website",
  },
};

export default function Page() {
  return <ReviewsClient />;
}
