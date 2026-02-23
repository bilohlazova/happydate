"use client";

import { Suspense } from "react";
import NotesPageContent from "./NotesPageContent";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NotesPageContent />
    </Suspense>
  );
}