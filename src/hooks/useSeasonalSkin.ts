// src/hooks/useSeasonalSkin.ts
/**
 * Повертає клас градієнта, колір "хвостика" і набір підказок залежно від місяця.
 * Місяць: 0=січень ... 11=грудень
 */
type Skin = {
  bg: string;        // Tailwind bg gradient classes
  tail: string;      // Tailwind border-l-* для хвостика
  emoji: string;     // Маленький акцент (можна показувати у хінтах)
  hints: string[];   // Ротація підказок у лаунчері
};

const skins: Record<number, Skin> = {
  0:  { bg: "from-sky-500 to-cyan-500", tail: "border-l-cyan-500", emoji: "❄️",
        hints: ["Mama • zimowy nastrój • do 120 zł", "Przyjaciółka • świeca • 60–90 zł", "Brat • kubek termiczny • 50–80 zł"] },
  1:  { bg: "from-pink-500 to-rose-500", tail: "border-l-rose-500", emoji: "💘",
        hints: ["Walentynki • 100–150 zł • romantycznie", "Dziewczyna • lawenda • 50 zł", "On • kolacja w domu • 120 zł"] },
  2:  { bg: "from-fuchsia-500 to-pink-500", tail: "border-l-pink-500", emoji: "🌷",
        hints: ["Dzień Kobiet • do 100 zł", "Kwiaty + liścik QR • 80–120 zł", "Przyjaciółka • kawa • 70–90 zł"] },
  3:  { bg: "from-emerald-500 to-teal-500", tail: "border-l-teal-500", emoji: "🌿",
        hints: ["Mama • ogród • 80–120 zł", "On • majsterkowanie • 150–200 zł", "Koleżanka • roślina • do 80 zł"] },
  4:  { bg: "from-lime-500 to-emerald-500", tail: "border-l-emerald-500", emoji: "🌼",
        hints: ["Komunia • spersonalizowane • 100–150 zł", "Tata • grill • 80–140 zł", "Dla dziecka • kreatywne • 60–100 zł"] },
  5:  { bg: "from-amber-500 to-orange-500", tail: "border-l-orange-500", emoji: "☀️",
        hints: ["Wakacje • podróżne • 80–130 zł", "Kolega • kubek termiczny • 60–90 zł", "Siostra • fotoalbum • 100–150 zł"] },
  6:  { bg: "from-orange-500 to-red-500", tail: "border-l-red-500", emoji: "🍉",
        hints: ["Urodziny latem • 120 zł", "On • gadżet • 100–160 zł", "Dla pary • gry • 70–110 zł"] },
  7:  { bg: "from-cyan-500 to-sky-500", tail: "border-l-sky-500", emoji: "🌊",
        hints: ["Powrót z wakacji • pamiątka • 80–120 zł", "Kawa na wynos • 50–70 zł", "Mama • relaks • 100–150 zł"] },
  8:  { bg: "from-amber-600 to-yellow-500", tail: "border-l-amber-600", emoji: "🍁",
        hints: ["Jesień • koc + herbata • 80–120 zł", "Koleżanka • świeca • 60–90 zł", "On • kubek • 50–80 zł"] },
  9:  { bg: "from-violet-500 to-fuchsia-500", tail: "border-l-violet-500", emoji: "🎃",
        hints: ["Jesienne urodziny • 100–150 zł", "Przyjaciółka • wellness • 150–220 zł", "Brat • gadżet • 120–180 zł"] },
  10: { bg: "from-rose-500 to-red-500", tail: "border-l-rose-500", emoji: "🕯️",
        hints: ["Mikołajki • do 80 zł", "Kolega • śmieszny prezent • 50–70 zł", "Siostra • kosmetyki • 100–150 zł"] },
  11: { bg: "from-yellow-500 to-amber-600", tail: "border-l-amber-600", emoji: "🎄",
        hints: ["Święta • 100–150 zł • personalizuj", "Dla rodziny • fotoksiążka • 120–180 zł", "Dla niej • biżuteria • 150–250 zł"] },
};

export function useSeasonalSkin(debugMonth?: number) {
  const month = typeof debugMonth === "number" ? Math.max(0, Math.min(11, debugMonth)) : new Date().getMonth();
  return skins[month];
}
