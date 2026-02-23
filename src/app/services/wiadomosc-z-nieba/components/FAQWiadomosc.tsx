"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "Czy ktoś inny zobaczy moją wiadomość?",
    a: "Nie. Wiadomość jest szyfrowana i przechowywana w prywatnym zasobie. Dostęp otrzymuje wyłącznie wskazany odbiorca w wybranym dniu.",
  },
  {
    q: "Jak długo przechowywana jest wiadomość?",
    a: "Standardowo każda wiadomość jest przechowywana przez 12 miesięcy. Możesz łatwo przedłużyć ten okres o kolejne lata (9 zł/rok).",
  },
  {
    q: "Czy mogę wysłać próbne otwarcie?",
    a: "Tak. Możesz ustawić testową kapsułę, która otworzy się np. za 1 dzień, aby sprawdzić działanie systemu.",
  },
  {
    q: "Jak działa wiadomość wideo?",
    a: "Przesyłasz swoje gotowe nagranie (do 10 minut, max 1 GB). My przechowamy je i wyślemy odbiorcy w wybranym dniu.",
  },
  {
    q: "Co jeśli zapomnę przedłużyć przechowywania?",
    a: "Otrzymasz przypomnienie mailowe przed końcem okresu przechowywania. Możesz też pobrać swoją wiadomość w każdej chwili.",
  },
];

export default function FAQWiadomosc() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="relative py-20 bg-gradient-to-b from-[#fafcff] via-[#f7f6ff] to-[#fff7fb]">
      {/* dekoracyjne pastelowe plamy */}
      <span className="pointer-events-none absolute -left-10 top-32 h-56 w-56 rounded-full bg-pink-200/30 blur-3xl" />
      <span className="pointer-events-none absolute -right-16 bottom-20 h-72 w-72 rounded-full bg-sky-200/35 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-4xl px-6">
        <h2 className="text-center text-3xl md:text-4xl font-bold text-slate-900">
          Najczęściej zadawane pytania
        </h2>

        <div className="mt-10 space-y-4">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-white/70 bg-white/70 backdrop-blur-lg shadow-[0_16px_40px_-20px_rgba(0,0,0,0.1)] transition"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between px-5 py-4 text-left text-slate-900 font-medium focus:outline-none"
              >
                {faq.q}
                <ChevronDown
                  className={`h-5 w-5 text-slate-500 transition-transform ${
                    openIndex === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openIndex === i && (
                <div className="px-5 pb-5 text-slate-600">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
