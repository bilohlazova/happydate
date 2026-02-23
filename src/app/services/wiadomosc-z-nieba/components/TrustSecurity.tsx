"use client";

import { ShieldCheck, Clock, Database, UserCheck } from "lucide-react";

export default function TrustSecurity() {
  const items = [
    {
      icon: ShieldCheck,
      title: "Prywatność i bezpieczeństwo",
      desc: "Twoja wiadomość jest szyfrowana i dostępna tylko dla Ciebie oraz wskazanego odbiorcy.",
    },
    {
      icon: Clock,
      title: "12 miesięcy przechowywania",
      desc: "Każda wiadomość jest przechowywana przez rok z możliwością przedłużenia na kolejne lata.",
    },
    {
      icon: Database,
      title: "Kopie zapasowe",
      desc: "Dane są w niezależnych centrach danych, aby zagwarantować ich trwałość.",
    },
    {
      icon: UserCheck,
      title: "Strażnik wiadomości",
      desc: "Możesz dodać zaufaną osobę, która potwierdzi wysyłkę w odpowiednim momencie.",
    },
  ];

  return (
    <section className="relative py-20 bg-gradient-to-b from-[#fafcff] via-[#f7f6ff] to-[#fff7fb]">
      {/* dekoracyjne pastelowe blob’y */}
      <span className="pointer-events-none absolute -left-10 top-24 h-52 w-52 rounded-full bg-pink-200/30 blur-3xl" />
      <span className="pointer-events-none absolute -right-12 bottom-24 h-64 w-64 rounded-full bg-sky-200/35 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-6xl px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
          Zaufanie i bezpieczeństwo
        </h2>
        <p className="mt-4 text-lg text-slate-600 max-w-3xl mx-auto">
          Wiemy, że powierzając nam swoją wiadomość, oczekujesz najwyższego
          poziomu ochrony. Dlatego stworzyliśmy system, który zapewnia prywatność
          i niezawodność dostarczenia.
        </p>

        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex flex-col items-center text-center rounded-2xl border border-white/70 bg-white/70 p-6 shadow-[0_16px_50px_-20px_rgba(0,0,0,.15)] backdrop-blur-lg transition hover:shadow-[0_20px_60px_-18px_rgba(0,0,0,.18)]"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 shadow-lg">
                <item.icon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                {item.title}
              </h3>
              <p className="mt-2 text-slate-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
