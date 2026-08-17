"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import ErrorFallback from "@/components/ErrorFallback";
import { reportClientError } from "@/lib/observability/reportClientError";

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const locale = useLocale();
  useEffect(() => {
    void reportClientError(error, "route-boundary", error.digest ?? null);
  }, [error]);
  return <ErrorFallback locale={locale} onRetry={reset} />;
}
