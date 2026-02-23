"use client";

import { useState } from "react";

export default function RokSEOInfo() {
  const [open, setOpen] = useState(false);

  return (
    <section className="bg-white dark:bg-gray-900">
      <div className="max-w-5xl mx-auto px-6">
        {/* Стріп */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 px-4 py-3 flex items-start justify-between gap-4">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            <strong>Dlaczego Rok Radości?</strong> Subskrypcja przypomnień i
            pomysłów na prezenty – AI + doradca człowiek. Jedna decyzja = 12 miesięcy spokoju.
          </p>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="shrink-0 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1 text-sm hover:bg-white/70 dark:hover:bg-slate-700"
            aria-expanded={open}
            aria-controls="seo-more"
          >
            {open ? "Zwiń" : "Czytaj więcej"}
          </button>
        </div>

        {/* Розкривний повний текст */}
        <div
          id="seo-more"
          className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${
            open ? "max-h-[800px]" : "max-h-0"
          }`}
        >
          <div className="prose prose-pink dark:prose-invert px-2 md:px-4 pt-4">
            <p>
              Każdy z nas choć raz zapomniał o ważnej dacie – urodzinach, rocznicy czy Dniu Matki.
              <strong> Rok Radości</strong> pilnuje Twojego kalendarza i podpowiada trafione
              prezenty w odpowiednim momencie.
            </p>
            <p>
              Łączymy <strong>przypomnienia</strong>, sugestie <strong>AI</strong> oraz wsparcie
              doradcy, abyś miał pewność, że gest będzie na czas i z sercem. W wersji MVP
              koncentrujemy się na cyfrowych podpowiedziach, checklistach i konsultacjach; później
              dołączymy partnerów i paczki fizyczne.
            </p>
            <p>
              <strong>Jedna decyzja = dwanaście spokojnych miesięcy.</strong> Więcej czasu dla
              bliskich, mniej stresu.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
