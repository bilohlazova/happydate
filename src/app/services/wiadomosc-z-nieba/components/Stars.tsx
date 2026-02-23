"use client";

import { useEffect, useState } from "react";

export default function Stars() {
  const [stars, setStars] = useState<
    Array<{ x: number; y: number; r: number; cls: string }>
  >([]);

  useEffect(() => {
    const next = Array.from({ length: 140 }).map((_, i) => {
      const x = Math.random() * 100;
      const y = Math.random() * 70;
      const r = Math.random() * 0.9 + 0.3;
      const cls = i % 3 === 0 ? "twinkle" : i % 5 === 0 ? "twinkle2" : "";
      return { x, y, r, cls };
    });
    setStars(next);
  }, []);

  if (stars.length === 0) return null;

  return (
    <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g" r="1">
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="grad-comet" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      {stars.map((s, i) => (
        <circle
          key={i}
          cx={`${s.x}%`}
          cy={`${s.y}%`}
          r={s.r}
          className={s.cls}
          fill="url(#g)"
        />
      ))}

      {/* Комета 🌠 */}
      <line
        x1="95%"
        y1="10%"
        x2="85%"
        y2="14%"
        className="shooting-star"
      />

      <style jsx>{`
        @keyframes twinkle {
          0%,
          100% {
            opacity: 0.85;
          }
          50% {
            opacity: 0.4;
          }
        }
        .twinkle {
          animation: twinkle 3.5s ease-in-out infinite;
        }
        .twinkle2 {
          animation: twinkle 5.2s ease-in-out infinite;
        }

        @keyframes comet {
          0% {
            opacity: 0;
            transform: translateX(0) translateY(0);
          }
          10% {
            opacity: 1;
            transform: translateX(-120px) translateY(40px);
          }
          20% {
            opacity: 0;
            transform: translateX(-240px) translateY(80px);
          }
          100% {
            opacity: 0;
          }
        }
        .shooting-star {
          stroke: url(#grad-comet);
          stroke-width: 2;
          stroke-linecap: round;
          opacity: 0;
          animation: comet 6s ease-in-out infinite;
        }
      `}</style>
    </svg>
  );
}
