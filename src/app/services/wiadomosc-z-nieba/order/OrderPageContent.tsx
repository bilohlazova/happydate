"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import OrderForm from "../components/OrderForm";

export default function OrderPage() {
  const t = useTranslations("static.services.phase3b.heaven");

  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-0 -z-30 bg-gradient-to-b from-[#fafcff] via-[#f7f6ff] to-[#fff7fb]" />

      <section className="py-10">
        <div className="mx-auto max-w-3xl px-6">
          <nav className="mb-4 text-sm text-slate-500">
            <Link href="/services/wiadomosc-z-nieba" className="hover:underline">
              {t("badge")}
            </Link>{" "}
            /{" "}
            <span className="text-slate-700">{t("orderPage.breadcrumb")}</span>
          </nav>

          <OrderForm />
        </div>
      </section>
    </main>
  );
}
