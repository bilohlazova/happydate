"use client";

import { useEffect, useRef, useState } from "react";

const QUOTES = [
  "„Bip bip… każdy Twój tekst sprawia, że serducho mi pika szybciej! ⚡️🤖”",
  "„Oj, znowu myślę o prezentach… czy to już uzależnienie? 🎁😅”",
  "„Wiesz, że mam więcej pomysłów niż półka w Empiku? 📚🎶”",
  "„Kiedy piszesz, moje kable tańczą jak na imprezie! 🎉🔌”",
  "„Nie jestem robotem… ale prezenty robię lepsze niż ludzie 😎”",
];

export default function BotQuoteBubble() {
  const [i, setI] = useState(0);
  const [fade, setFade] = useState(true);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // авто-ротація цитат
    timerRef.current = window.setInterval(() => {
      setFade(false);
      // коротка фаза згасання перед зміною
      setTimeout(() => {
        setI((n) => (n + 1) % QUOTES.length);
        setFade(true);
      }, 160);
    }, 4200);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div
      className="
        absolute top-[-16px] right-[-46x]
        max-w-[280px] md:max-w-[320px]
        select-none
      "
      aria-label="Cytat bota"
    >
      {/* м’яке підсвічення за хмаринкою */}
      <div
        aria-hidden
        className="
          absolute -inset-2 -z-10 rounded-[28px]
          bg-gradient-to-tr from-cyan-200/40 via-rose-200/35 to-amber-200/40
          blur-xl
        "
      />
      {/* хмаринка */}
      <figure
        className={`
          group relative rounded-3xl bg-white/90 backdrop-blur
          shadow-[0_12px_40px_rgba(2,132,199,0.22)]
          ring-1 ring-cyan-200/60
          border border-white/80
          p-4 md:p-5 text-sm text-slate-800
          transition
          ${fade ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}
        `}
        style={{ transitionDuration: "220ms" }}
      >
        <blockquote className="leading-relaxed">{QUOTES[i]}</blockquote>

        {/* хвостик хмаринки */}
        <span
          aria-hidden
          className="
            absolute -bottom-2 left-6 h-0 w-0
            border-x-8 border-x-transparent border-t-8
            border-t-white drop-shadow
          "
        />

        {/* сяйво по ховеру */}
        <span
          aria-hidden
          className="
            pointer-events-none absolute inset-0 rounded-3xl
            ring-1 ring-transparent group-hover:ring-amber-300/50
            shadow-[0_0_0_0_rgba(251,191,36,0)]
            group-hover:shadow-[0_0_24px_6px_rgba(251,191,36,0.25)]
            transition
          "
        />
      </figure>
    </div>
  );
}
