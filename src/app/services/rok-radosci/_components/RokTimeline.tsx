// без "use client" — це серверний компонент
type MonthItem = {
  m: string;
  label: string;
  type: "Mikrogest" | "Sezonowy" | "Wielki moment";
  note?: string;
};

const PLAN: MonthItem[] = [
  { m: "Styczeń",  label: "Herbata + kartka z QR", type: "Mikrogest", note: "Nowy rok, ciepły gest" },
  { m: "Luty",     label: "Walentynki – inspiracje", type: "Sezonowy", note: "Pomysły w różnych budżetach" },
  { m: "Marzec",   label: "Dzień Kobiet – przypomnienie", type: "Sezonowy" },
  { m: "Kwiecień", label: "Wiosenny spacer + playlisty", type: "Mikrogest" },
  { m: "Maj",      label: "Dzień Matki – propozycje", type: "Sezonowy" },
  { m: "Czerwiec", label: "Zdjęcia + mini-album", type: "Mikrogest" },
  { m: "Lipiec",   label: "Letnia niespodzianka", type: "Mikrogest" },
  { m: "Sierpień", label: "Urodziny? – personalizacja", type: "Wielki moment" },
  { m: "Wrzesień", label: "Powrót do rytmu – kawka", type: "Mikrogest" },
  { m: "Październik", label: "Jesienna świeca/książka", type: "Mikrogest" },
  { m: "Listopad", label: "Dzień Życzliwości – kartka", type: "Mikrogest" },
  { m: "Grudzień", label: "Święta – przegląd propozycji", type: "Sezonowy", note: "Wysyłamy wcześniej!" },
];

const TYPE_BADGE: Record<MonthItem["type"], string> = {
  "Mikrogest": "bg-emerald-100 text-emerald-700",
  "Sezonowy": "bg-amber-100 text-amber-700",
  "Wielki moment": "bg-pink-100 text-pink-700",
};

export default function RokTimeline() {
  return (
    <section className="py-16 bg-white dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-baseline justify-between flex-wrap gap-4">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
            Roczny harmonogram
          </h2>
          <div className="flex items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-emerald-400" /> Mikrogest
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-amber-400" /> Sezonowy
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-pink-500" /> Wielki moment
            </span>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {PLAN.map((item) => (
            <div
              key={item.m}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800 p-5 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{item.m}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${TYPE_BADGE[item.type]}`}>
                  {item.type}
                </span>
              </div>
              <p className="mt-2 text-slate-700 dark:text-slate-300">{item.label}</p>
              {item.note && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.note}</p>
              )}
            </div>
          ))}
        </div>

        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
          To przykładowy plan. W panelu ustawisz własne daty (urodziny, rocznice, święta) i styl niespodzianek.
        </p>
      </div>
    </section>
  );
}
