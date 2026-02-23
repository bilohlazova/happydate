"use client";

import { Suspense } from "react";
import OrderPageContent from "./OrderPageContent";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OrderPageContent />
    </Suspense>
  );
}