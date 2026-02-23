export default function AIHowItWorks() {
  const steps = [
    {
      n: "Krok 1",
      emoji: "🧩",
      title: "Opisz osobę i okazję",
      text: "Kim jest obdarowana osoba, co lubi, jaki styl życia, jaki budżet zakładasz.",
    },
    {
      n: "Krok 2",
      emoji: "🎁",
      title: "Otrzymaj 2–3 trafione propozycje",
      text: "Każda z krótkim opisem, uzasadnieniem i widełkami cenowymi.",
    },
    {
      n: "Krok 3",
      emoji: "⚡",
      title: "Zrealizuj w 1 klik",
      text: "Szybkie linki do zakupu lub wsparcie konsultanta z dostawą „na czas”.",
    },
  ];

  return (
    <section className="mx-auto max-w-5xl px-6 py-14">
      <h2 className="text-center text-2xl md:text-3xl font-extrabold text-slate-900">
        Jak działa Asystent?
      </h2>
      <p className="mt-3 text-center text-slate-600">
        Trzy proste kroki od pytania do idealnego prezentu.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {steps.map((s) => (
          <article
            key={s.n}
            className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow ring-1 ring-black/5 text-[18px]">
                {s.emoji}
              </div>
              <div className="text-2xl font-extrabold text-slate-800">
                {s.n}
              </div>
            </div>
            <h3 className="mt-3 text-lg font-semibold text-slate-900">
              {s.title}
            </h3>
            <p className="mt-1 text-slate-600">{s.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
