"use client";

import { HeartHandshake } from "lucide-react";

import { AddPersonMenu } from "@/components/people/AddPersonMenu";

export function PeopleHeader() {
  return (
    <section className="flex items-end justify-between gap-3">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-[2rem] font-black leading-none text-slate-950 sm:text-[2.25rem]">
            Osoby
          </h1>
          <HeartHandshake
            className="mt-0.5 h-7 w-7 text-blue-600 sm:h-8 sm:w-8"
            strokeWidth={2.25}
          />
        </div>
        <p className="mt-1 text-[0.9rem] font-semibold leading-snug text-slate-500">
          Twoi ludzie. Twoje relacje.
        </p>
      </div>

      <div className="shrink-0">
        <AddPersonMenu />
      </div>
    </section>
  );
}
