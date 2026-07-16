"use client";

import { Suspense } from "react";
import RegisterPageContent from "./RegisterPageContent";
import { useTranslations } from "next-intl";

export default function Page() {
  const translate = useTranslations("auth.common");
  return (
    <Suspense fallback={<div role="status">{translate("loading")}</div>}>
      <RegisterPageContent />
    </Suspense>
  );
}
