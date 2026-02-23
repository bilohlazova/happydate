export default function AIFAQ() {
  const items: { q: string; a: string }[] = [
    {
      q: "Czy AI zastępuje człowieka?",
      a: "Nie. AI proponuje pomysły, a gdy trzeba — dołącza konsultant i organizuje całość.",
    },
    {
      q: "Czy usługa jest darmowa?",
      a: "Tak. Rekomendacje są bezpłatne — płacisz dopiero przy zakupie prezentu.",
    },
    {
      q: "Jak dbacie o prywatność?",
      a: "Korzystasz anonimowo. Dane nie są przekazywane podmiotom trzecim.",
    },
    {
      q: "Czy mogę dodać wydarzenie i wrócić później?",
      a: "Tak. Zapisz datę w kalendarzu HappyDate — przypomnimy o prezencie.",
    },
    {
      q: "Czy ogarniacie dostawę „na konkretny dzień”?",
      a: "Tak. Wspieramy dostawę „na czas”, a przy specjalnych okazjach — z personalizowaną kartką/wiadomością.",
    },
  ];

  return (
    <section className="mx-auto max-w-5xl px-6 py-14">
      <h2 className="mb-8 text-center text-2xl md:text-3xl font-extrabold text-neutral-900">
        Najczęstsze pytania
      </h2>
      <div className="grid gap-4">
        {items.map(({ q, a }) => (
          <details key={q} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <summary className="cursor-pointer font-semibold">{q}</summary>
            <p className="mt-2 text-neutral-700">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
