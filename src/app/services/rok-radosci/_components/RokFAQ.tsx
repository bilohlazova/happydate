// src/components/services/RokFAQ.tsx
export default function RokFAQ() {
  const items = [
    {
      q: "Czy mogę zrezygnować?",
      a: "Tak. Masz 14 dni na rezygnację od zawarcia umowy (o ile nie zrealizowano już indywidualnych usług, np. projektów personalizowanych). Rezygnację włączysz w profilu lub przez kontakt z nami.",
    },
    {
      q: "Anonimowy nadawca?",
      a: "Tak. Przy tworzeniu niespodzianki możesz zaznaczyć „Wyślij anonimowo”. Adresat otrzyma paczkę/wiadomość bez Twoich danych (poza wymaganiami kuriera).",
    },
    {
      q: "Jak działa doradca?",
      a: "W planie Concierge doradca towarzyszy Ci przy maks. 12 wydarzeniach rocznie: proponuje pomysły, wysyła gotowe linki do zakupu i pilnuje terminów. Kontakt przez czat lub e-mail.",
    },
  ];

  return (
    <section className="py-20 bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-center text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
          FAQ – Najczęstsze pytania
        </h2>
        <div className="mt-8 space-y-6">
          {items.map((it) => (
            <details
              key={it.q}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:bg-slate-800 dark:border-slate-700"
            >
              <summary className="cursor-pointer font-semibold">
                {it.q}
              </summary>
              <p className="mt-2 text-slate-600 dark:text-slate-300">{it.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
