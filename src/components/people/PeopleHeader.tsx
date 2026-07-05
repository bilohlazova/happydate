"use client";

import { HeartHandshake } from "lucide-react";

import { AddPersonMenu } from "@/components/people/AddPersonMenu";

export function PeopleHeader() {
  return (
    <section className="flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-[3.1rem] font-black leading-none tracking-normal text-slate-950 sm:text-6xl">
            Osoby
          </h1>
          <HeartHandshake
            className="mt-2 h-11 w-11 text-blue-600 sm:h-12 sm:w-12"
            strokeWidth={2.25}
          />
        </div>
        <p className="mt-2 text-xl font-medium leading-tight text-slate-500 sm:text-2xl">
          Twoi ludzie. Twoje relacje.
        </p>
      </div>

      <div className="shrink-0 pt-1">
        <AddPersonMenu />
      </div>
    </section>
  );
}
