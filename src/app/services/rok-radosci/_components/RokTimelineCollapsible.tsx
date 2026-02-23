"use client";

import { useState } from "react";
import RokTimeline from "./RokTimeline";

export default function RokTimelineCollapsible() {
  const [open, setOpen] = useState(false);

  return (
    <section className="bg-white dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="rok-timeline"
          className="w-full rounded-2xl border border-pink-300 bg-pink-50 px-5 py-4 text-left shadow hover:shadow-md dark:border-pink-500/40 dark:bg-slate-800"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-lg md:text-xl font-extrabold text-slate-900 dark:text-white">
                Roczny harmonogram
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Zobacz przykładowy plan 12 miesięcy (mikrogesty, sezonowe chwile i wielkie momenty)
              </p>
            </div>
            <span
              className={`inline-block rotate-0 transition-transform ${
                open ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            >
              ▾
            </span>
          </div>
        </button>

        {/* розкривна частина з простою анімацією висоти */}
        <div
          id="rok-timeline"
          className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${
            open ? "max-h-[2000px]" : "max-h-0"
          }`}
        >
          {/* невеликий внутрішній відступ щоб контент не „стрибав” */}
          <div className="pt-4">
            <RokTimeline />
          </div>
        </div>
      </div>
    </section>
  );
}
