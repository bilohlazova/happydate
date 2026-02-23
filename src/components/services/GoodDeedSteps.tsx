"use client";

export default function GoodDeedSteps() {
  const steps = [
    {
      title: "Wybierz kierunek dobra",
      text:
        "Zwierzęta, dzieci lub planeta — wybierz to, co porusza Twoje serce najbardziej.",
      emoji: "🎯",
    },
    {
      title: "Zarezerwuj termin",
      text:
        "Podaj wygodną datę i miejsce. Pomożemy Ci skoordynować wizytę.",
      emoji: "📅",
    },
    {
      title: "Przygotuj drobny gest",
      text:
        "Może to być paczka karmy, książeczki, roślinka do posadzenia lub po prostu Twój czas.",
      emoji: "🎁",
    },
    {
      title: "Zostaw ślad dobra",
      text:
        "Przyjdź, poznaj, pobądź. To wystarczy. A jeśli chcesz — opowiedz o tym innym.",
      emoji: "✨",
    },
  ];

  return (
    <section className="py-16 md:py-20 bg-white dark:bg-gray-900">
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">
          Jak to działa?
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-shadow bg-white/70 dark:bg-gray-800/60 backdrop-blur"
            >
              <div className="text-3xl mb-3">{s.emoji}</div>
              <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {s.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
