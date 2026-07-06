"use client";

import { HeartHandshake } from "lucide-react";

import { AddPersonMenu } from "@/components/people/AddPersonMenu";
import { MobileUI } from "@/lib/theme/mobile";

export function PeopleHeader() {
  return (
    <section className={MobileUI.header}>
      <div>
        <div className="flex items-center gap-3">
          <h1 className={MobileUI.title}>
            Osoby
          </h1>
          <HeartHandshake
            className="mt-1 h-9 w-9 text-blue-600 sm:h-10 sm:w-10"
            strokeWidth={2.25}
          />
        </div>
        <p className={MobileUI.pageSubtitle}>
          Twoi ludzie. Twoje relacje.
        </p>
      </div>

      <div className="shrink-0 pt-1">
        <AddPersonMenu />
      </div>
    </section>
  );
}
