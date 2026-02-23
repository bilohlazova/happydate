import type { Metadata } from "next";
import Link from "next/link";
import OrderForm from "../components/OrderForm";

export const metadata: Metadata = {
  title: "Zamów wiadomość – HappyDate",
  description:
    "Wybierz pakiet, podaj odbiorcę i datę dostarczenia. Resztą zajmiemy się my.",
  alternates: { canonical: "/services/wiadomosc-z-nieba/order" },
};

export default function OrderPage() {
  return (
    <main className="relative overflow-hidden">
      {/* pastel tło jak na pozostałych sekcjach */}
      <div className="absolute inset-0 -z-30 bg-gradient-to-b from-[#fafcff] via-[#f7f6ff] to-[#fff7fb]" />

      <section className="py-10">
        <div className="mx-auto max-w-3xl px-6">
          {/* breadcrumbs */}
          <nav className="mb-4 text-sm text-slate-500">
            <Link href="/services/wiadomosc-z-nieba" className="hover:underline">
              Wiadomość z Nieba
            </Link>{" "}
            / <span className="text-slate-700">Zamówienie</span>
          </nav>

          {/* сама форма */}
          <OrderForm />
        </div>
      </section>
    </main>
  );
}
