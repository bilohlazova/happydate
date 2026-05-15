// src/utils/confetti.ts
/**
 * Легка обгортка над canvas-confetti:
 * - динамічний імпорт (не ламає SSR)
 * - повага до prefers-reduced-motion
 */

function motionOff() {
  return typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export async function burstAt(x: number, y: number, opts?: { particleCount?: number }) {
  if (motionOff()) return;
  const confetti = (await import("canvas-confetti")).default;
  const origin = { x: x / window.innerWidth, y: y / window.innerHeight };
  const base = { origin, spread: 60, startVelocity: 38, ticks: 200, scalar: 0.9 };

  confetti({ particleCount: opts?.particleCount ?? 50, ...base });
  confetti({ particleCount: 25, ...base, scalar: 0.7, decay: 0.94 });
}

export async function gentleOnceNearLauncher(key = "hd-gifttag-once") {
  if (motionOff()) return;
  if (typeof window === "undefined") return;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");

  const confetti = (await import("canvas-confetti")).default;
  // трохи правіше-нижче (де зазвичай кнопка)
  confetti({
    particleCount: 26,
    spread: 50,
    origin: { x: 0.92, y: 0.9 },
    scalar: 0.75,
    ticks: 180,
  });
}
