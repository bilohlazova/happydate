"use client";

import { HeartHandshake, RotateCcw } from "lucide-react";

const COPY = {
  uk: { title: "Happy трохи розгубився", body: "Ваші дані в безпеці. Спробуймо відкрити цю сторінку ще раз.", retry: "Спробувати ще раз" },
  pl: { title: "Happy na chwilę się zgubił", body: "Twoje dane są bezpieczne. Spróbujmy otworzyć tę stronę ponownie.", retry: "Spróbuj ponownie" },
  en: { title: "Happy lost the thread for a moment", body: "Your data is safe. Let’s try opening this page again.", retry: "Try again" },
  de: { title: "Happy hat kurz den Faden verloren", body: "Deine Daten sind sicher. Versuchen wir, diese Seite erneut zu öffnen.", retry: "Erneut versuchen" },
  ru: { title: "Happy на мгновение растерялся", body: "Ваши данные в безопасности. Попробуем открыть эту страницу снова.", retry: "Попробовать снова" },
} as const;

export function errorFallbackCopy(locale: string) {
  return COPY[locale as keyof typeof COPY] ?? COPY.en;
}

export default function ErrorFallback({ locale, onRetry }: { locale: string; onRetry: () => void }) {
  const copy = errorFallbackCopy(locale);
  return (
    <main className="mx-auto flex min-h-[68dvh] w-full max-w-xl items-center px-5 py-12">
      <section role="alert" className="w-full rounded-[2rem] border border-rose-100 bg-gradient-to-br from-white via-rose-50/60 to-amber-50 p-7 text-center shadow-[0_24px_70px_rgba(190,24,93,0.10)] sm:p-10">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-rose-500 shadow-sm" aria-hidden="true">
          <HeartHandshake className="h-8 w-8" />
        </span>
        <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-950">{copy.title}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-slate-600">{copy.body}</p>
        <button type="button" onClick={onRetry} className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-extrabold text-white shadow-lg shadow-slate-950/15">
          <RotateCcw className="h-4 w-4" />
          {copy.retry}
        </button>
      </section>
    </main>
  );
}
