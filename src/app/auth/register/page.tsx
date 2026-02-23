"use client";

import { Suspense } from "react";
import RegisterPageContent from "./RegisterPageContent";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterPageContent />
    </Suspense>
  );
}