"use client";

import { CheckCircle } from "lucide-react";

export default function HowItWorks() {
  const steps = [
    {
      title: "1. Nagraj lub napisz wiadomość",
      desc: "Przygotuj swój list lub wideo. Wystarczy prosty tekst lub gotowe nagranie.",
    },
    {
      title: "2. Wybierz datę i odbiorcę",
      desc: "Podaj dzień, w którym wiadomość ma dotrzeć, oraz e-mail lub adres fizyczny odbiorcy.",
    },
    {
      title: "3. My zajmiemy się resztą",
      desc: "Bezpiecznie przechowamy Twoją wiadomość i dostarczymy ją dokładnie w wybranym dniu.",
    },
  ];

  return (
    <section
      id="jak-to-dziala"
      className="relative py-20 bg-gradient-to-b from-[#fdfbff] via-[#f6f9ff] to-[#fef9ff]"
      aria-labelledby="how-it-works-heading"
    >
      <div className="max-w-5xl mx-auto px-6 text-center">
        <h2
          id="how-it-works-heading"
          className="text-3xl md:text-4xl font-bold text-slate-900"
        >
          Jak to działa?
        </h2>
        <p className="mt-4 text-lg text-slate-600">
          Trzy proste kroki, aby Twoje słowa dotarły we właściwym czasie.
        </p>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <div
              key={i}
              className="relative flex flex-col items-center text-center rounded-2xl border border-white/70 bg-white/70 px-6 py-8 shadow-[0_12px_40px_-15px_rgba(0,0,0,0.1)] backdrop-blur-md transition hover:shadow-lg"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-pink-400 to-fuchsia-500 shadow-lg">
                <CheckCircle className="h-8 w-8 text-white" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                {step.title}
              </h3>
              <p className="mt-2 text-slate-600">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
