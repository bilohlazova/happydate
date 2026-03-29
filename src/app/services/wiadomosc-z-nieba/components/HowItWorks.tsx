"use client";

export default function HowItWorks() {
  const steps = [
    { n: "01", emoji: "✍️", title: "Nagraj lub napisz", desc: "Przygotuj list tekstowy lub nagraj wideo (do 10 min). Możesz to zrobić spokojnie, we własnym tempie." },
    { n: "02", emoji: "📅", title: "Wybierz datę i odbiorcę", desc: "Wskaż dzień dostarczenia i adres e-mail odbiorcy. Możesz wybrać datę nawet za wiele lat." },
    { n: "03", emoji: "🔒", title: "My przechowujemy bezpiecznie", desc: "Twoja wiadomość jest szyfrowana i przechowywana przez 12 miesięcy z możliwością przedłużenia." },
    { n: "04", emoji: "💌", title: "Dostarczamy w wybranym dniu", desc: "W wybranym dniu wysyłamy wiadomość do odbiorcy. Otrzymasz potwierdzenie dostarczenia." },
  ];

  return (
    <section id="jak-to-dziala" className="relative py-16 bg-gradient-to-b from-[#f0f9ff] to-[#f8faff]">
      <div className="max-w-5xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Jak to działa?</h2>
        <p className="mt-3 text-lg text-slate-500">Cztery kroki, aby Twoje słowa dotarły we właściwym czasie.</p>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map(s => (
            <div key={s.n} className="flex flex-col items-center text-center rounded-2xl border border-sky-100 bg-white px-5 py-7 shadow-sm hover:shadow-md transition">
              <div className="mb-3 flex h-14 w-14 flex-col items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-500 shadow">
                <span className="text-[10px] font-bold text-sky-100">{s.n}</span>
                <span className="text-xl leading-none">{s.emoji}</span>
              </div>
              <h3 className="text-base font-semibold text-slate-900">{s.title}</h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}