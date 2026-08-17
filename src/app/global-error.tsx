"use client";

import { useEffect } from "react";
import ErrorFallback from "@/components/ErrorFallback";
import { reportClientError } from "@/lib/observability/reportClientError";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    void reportClientError(error, "global-boundary", error.digest ?? null);
  }, [error]);
  return (
    <html lang="en">
      <body className="m-0 bg-slate-50 font-sans text-slate-950">
        <ErrorFallback locale="en" onRetry={reset} />
      </body>
    </html>
  );
}
