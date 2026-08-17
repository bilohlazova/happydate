"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/observability/reportClientError";

export default function ClientErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      void reportClientError(event.error ?? new Error("window_error"), "window-error");
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      void reportClientError(event.reason, "unhandled-rejection");
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
