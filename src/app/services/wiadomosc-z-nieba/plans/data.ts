export type PlanType = "list_cyfrowy" | "list_drukowany" | "video_cyfrowe" | "video_premium";

export type PlanRecord = {
  type: PlanType;
  slug: string;              // url
  name: string;
  price: string;
  short: string;             // krótki opis (karta)
  long: string;              // dłuższy opis (strona szczegółów)
  features: string[];
  includes?: string[];       // co zawiera
  delivery?: string[];       // dostawa / jak to działa
};

export const plans: PlanRecord[] = [
  {
    type: "list_cyfrowy",
    slug: "list-cyfrowy",
    name: "List cyfrowy",
    price: "99 zł",
    short: "Dostawa e-mailem lub SMS-em we wskazanym dniu.",
    long:
      "Wyślij słowa prosto do serca — w formie cyfrowej. Twój list bezpiecznie przechowamy i doręczymy e-mailem lub SMS-em dokładnie w wybranym dniu. Idealny, gdy liczy się czas i prostota.",
    features: [
      "Bezpieczne przechowywanie 12 miesięcy",
      "Dostawa cyfrowa (mail/SMS)",
      "Możliwość przedłużenia przechowywania",
    ],
    includes: ["Panel do podglądu i edycji", "Powiadomienie o doręczeniu"],
    delivery: ["Wybierasz datę i odbiorcę", "My dostarczamy w wybranym dniu"],
  },
  {
    type: "list_drukowany",
    slug: "list-drukowany",
    name: "List drukowany",
    price: "179 zł",
    short: "Elegancki druk, koperta i dostawa kurierem.",
    long:
      "Słowa, które można dotknąć. Twój list wydrukujemy na eleganckim papierze, zapakujemy w kopertę i dostarczymy kurierem. Dołączona kopia cyfrowa.",
    features: [
      "Przechowywanie 12 miesięcy",
      "Druk premium + koperta",
      "Dostawa kurierem",
      "Kopia cyfrowa w cenie",
    ],
    includes: ["Papier premium 120–150 g", "Koperta w kolorze kremowym"],
    delivery: ["Potwierdzenie wysyłki", "Śledzenie doręczenia"],
  },
  {
    type: "video_cyfrowe",
    slug: "wideo-cyfrowe",
    name: "Wideo cyfrowe",
    price: "199 zł",
    short: "Twoje nagranie (do 10 min) dostarczone bezpiecznym linkiem.",
    long:
      "Emocje zamknięte w obrazie i dźwięku. Prześlij wideo (do 10 minut), a my przechowamy je i doręczymy odbiorcy o wskazanej porze poprzez bezpieczny link.",
    features: [
      "Przechowywanie 12 miesięcy",
      "Bezpieczne linki do wideo",
      "Powiadomienie odbiorcy w dniu wysyłki",
    ],
    includes: ["Podgląd w panelu", "Transkodowanie do odtwarzania na każdym urządzeniu"],
  },
  {
    type: "video_premium",
    slug: "wideo-premium",
    name: "Wideo premium",
    price: "299 zł",
    short: "Pendrive + pudełko prezentowe oraz kopia cyfrowa.",
    long:
      "Najbardziej uroczysta forma wideowiadomości. Nagramy ją na pendrive i zapakujemy w eleganckie pudełko. Dołączamy również kopię cyfrową i dostawę kurierem.",
    features: [
      "Przechowywanie 12 miesięcy",
      "Pendrive + pudełko prezentowe",
      "Kopia cyfrowa w cenie",
      "Dostawa kurierem",
    ],
    includes: ["Pendrive 16–32 GB", "Pudełko prezentowe"],
    delivery: ["Kopia cyfrowa do natychmiastowego podglądu", "Dostawa kurierem w wybranym dniu"],
  },
];

export function getBySlug(slug: string) {
  return plans.find((p) => p.slug === slug);
}

export function getByType(type: PlanType) {
  return plans.find((p) => p.type === type);
}
