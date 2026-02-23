"use client";

import { Suspense } from "react";
import StartPageContent from "./StartPageContent";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StartPageContent />
    </Suspense>
  );
}