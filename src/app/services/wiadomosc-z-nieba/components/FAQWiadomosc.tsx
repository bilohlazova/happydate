"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "Czy ktoś inny zobaczy moją wiadomość?",
    a: "Nie. Wiadomość jest szyfrowana end-to-end. Nawet pracownicy HappyDate nie mają do niej dostępu. Wyłącznie wskazany odbiorca otrzymuje dostęp w wybranym dniu.",
  },
  {
    q: "Jak długo przechowywana jest wiadomość?",
    a: "Standardowo 12 miesięcy. Możesz przedłużyć o kolejne lata za 9 zł/rok. Przed końcem okresu wyślemy Ci przypomnienie e-mailem.",
  },
  {
    q: "Co się stanie, jeśli nie odnowię przechowywania?",
    a: "Na 30 dni przed wygaśnięciem otrzymasz powiadomienie. Jeśli nie odnowisz, wiadomość zostanie bezpowrotnie usunięta. Możesz też pobrać ją w każdej chwili z panelu klienta.",
  },
  {
    q: "Czy mogę zmienić datę wysyłki lub odbiorcę?",
    a: "Tak, do 24 godzin przed planowaną wysyłką możesz zmienić datę lub adres e-mail odbiorcy w panelu klienta.",
  },
  {
    q: "Co jeśli odbiorca nie odbierze wiadomości?",
    a: "W przypadku niedostarczenia (np. błędny e-mail) powiadamiamy Cię i dajemy 7 dni na podanie poprawnych danych. Jeśli to niemożliwe — zwracamy środki proporcjonalnie.",
  },
  {
    q: "Czy mam prawo do zwrotu?",
    a: "Usługa jest spersonalizowana i zgodnie z art. 38 pkt 3 ustawy o prawach konsumenta prawo do odstąpienia nie przysługuje po rozpoczęciu realizacji (tj. po przesłaniu wiadomości). Możesz anulować zamówienie przed wysłaniem treści i otrzymać pełny zwrot.",
  },
  {
    q: "Jak działa opcja wideo?",
    a: "Przesyłasz gotowe nagranie (do 10 minut, max 1 GB, popularne formaty mp4/mov). Odbiorca otrzymuje bezpieczny link ważny przez 30 dni od dnia wysyłki.",
  },
  {
    q: "Czy HappyDate weryfikuje treść wiadomości?",
    a: "Nie weryfikujemy treści ze względu na szyfrowanie. Nadawca ponosi pełną odpowiedzialność za zgodność treści z prawem. Zakazane jest przesyłanie treści niezgodnych z prawem polskim i UE.",
  },
];

export default function FAQWiadomosc() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="relative py-16 bg-gradient-to-b from-[#f8faff] to-[#f0f9ff]">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-center text-3xl md:text-4xl font-bold text-slate-900">
          Najczęściej zadawane pytania
        </h2>
        <p className="mt-3 text-center text-slate-500">W tym także kwestie prawne i techniczne.</p>

        <div className="mt-8 space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm transition hover:shadow-md">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between px-5 py-4 text-left font-medium text-slate-900 focus:outline-none"
              >
                {faq.q}
                <ChevronDown className={`h-5 w-5 flex-shrink-0 text-sky-400 transition-transform ml-3 ${openIndex === i ? "rotate-180" : ""}`} />
              </button>
              {openIndex === i && (
                <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</div>
              )}
            </div>
          ))}
        </div>

        {/* Додаткова юридична примітка */}
        <div className="mt-8 rounded-2xl border border-sky-100 bg-sky-50 px-5 py-4 text-sm text-sky-700">
          <p className="font-semibold mb-1">📋 Podstawa prawna</p>
          <p>Usługa świadczona jest na podstawie Regulaminu HappyDate zgodnie z przepisami polskiego prawa, ustawy o świadczeniu usług drogą elektroniczną oraz RODO (Rozporządzenie EU 2016/679). Administratorem danych jest HappyDate sp. z o.o. Wszelkie dane przetwarzane są wyłącznie w celu realizacji usługi.</p>
        </div>
      </div>
    </section>
  );
}