"use client";

import { ShieldCheck, Clock, Database, UserCheck } from "lucide-react";

export default function TrustSecurity() {
  const items = [
    {
      icon: ShieldCheck,
      title: "Szyfrowanie end-to-end",
      desc: "Twoja wiadomość jest szyfrowana — nie mamy do niej dostępu. Widzi ją tylko wskazany odbiorca w wybranym dniu.",
    },
    {
      icon: Clock,
      title: "12 miesięcy przechowywania",
      desc: "Standardowy okres to 12 miesięcy. Możesz przedłużyć przechowywanie o kolejne lata (9 zł/rok).",
    },
    {
      icon: Database,
      title: "Kopie zapasowe",
      desc: "Dane przechowujemy w co najmniej dwóch niezależnych centrach danych na terenie UE (RODO).",
    },
    {
      icon: UserCheck,
      title: "Strażnik wiadomości",
      desc: "Możesz wskazać zaufaną osobę, która potwierdzi wysyłkę — np. w przypadku Twojej niedyspozycji.",
    },
  ];

  return (
    <section className="relative py-16 bg-gradient-to-b from-[#f8faff] to-[#f0f9ff]">
      <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Zaufanie i bezpieczeństwo</h2>
        <p className="mt-3 text-lg text-slate-500 max-w-2xl mx-auto">
          Powierzasz nam coś wyjątkowego. Traktujemy to z pełną odpowiedzialnością.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {items.map((item, i) => (
            <div key={i} className="flex flex-col items-center text-center rounded-2xl border border-sky-100 bg-white p-6 shadow-sm hover:shadow-md transition">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-500 shadow">
                <item.icon className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Юридичний блок */}
        <div className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-5 text-left max-w-3xl mx-auto">
          <p className="text-sm font-semibold text-amber-800 mb-2">⚖️ Ważne informacje prawne</p>
          <ul className="text-sm text-amber-700 space-y-1.5 list-disc pl-4">
            <li>Usługa ma charakter spersonalizowany — po rozpoczęciu realizacji <strong>prawo do odstąpienia od umowy nie przysługuje</strong> (art. 38 pkt 3 ustawy o prawach konsumenta).</li>
            <li>HappyDate pełni rolę <strong>przechowawcy i kuriera</strong> wiadomości — nie weryfikuje jej treści ani nie ponosi odpowiedzialności za jej zawartość.</li>
            <li>W przypadku <strong>niedostarczenia</strong> (np. błędny adres e-mail) zwrot środków następuje proporcjonalnie po udokumentowanej nieudanej próbie dostarczenia.</li>
            <li>Przechowywanie danych odbywa się zgodnie z <strong>RODO</strong> na serwerach w UE. Dane są usuwane po upływie okresu przechowywania lub na Twój wniosek.</li>
            <li>W przypadku śmierci nadawcy wiadomość zostaje dostarczona zgodnie z wcześniej wskazanymi instrukcjami. <strong>HappyDate nie weryfikuje statusu życia nadawcy</strong>.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}