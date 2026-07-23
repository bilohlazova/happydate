"use client";

import { useTranslations } from "next-intl";

export default function OrderForm() {
  const t = useTranslations("static.services.phase3b.heaven.orderPage");

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h2 className="text-xl font-semibold mb-4">{t("formTitle")}</h2>
      <p className="text-gray-500">{t("formSoon")}</p>
    </div>
  );
}
