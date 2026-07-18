import type { PersonRelationKey } from "../repositories/person.types.ts";

const LEGACY_RELATION_KEYS: Record<string, PersonRelationKey> = {
  // spouse
  zona: "spouse", maz: "spouse", malzonka: "spouse", malzonek: "spouse",
  "maz / zona": "spouse",
  wife: "spouse", husband: "spouse", spouse: "spouse", "супруг / супруга": "spouse", "ehepartner/in": "spouse",
  дружина: "spouse", чоловік: "spouse", подружжя: "spouse",
  жена: "spouse", муж: "spouse", супруг: "spouse", супруга: "spouse",
  ehefrau: "spouse", ehemann: "spouse", ehepartner: "spouse",
  // partner
  partner: "partner", partnerka: "partner", boyfriend: "partner", girlfriend: "partner", "partner / partnerka": "partner",
  партнер: "partner", партнерка: "partner", партнёр: "partner", партнёрша: "partner", "партнер / партнерка": "partner", "партнёр / партнёрша": "partner", partnerin: "partner", "partner/in": "partner",
  // parent
  mama: "parent", matka: "parent", tata: "parent", ojciec: "parent",
  "mama / tata": "parent",
  mother: "parent", father: "parent", parent: "parent", мама: "parent", тато: "parent", "мама / тато": "parent",
  мать: "parent", отец: "parent", папа: "parent", "мама / папа": "parent", mutter: "parent", vater: "parent", elternteil: "parent",
  // child
  syn: "child", corka: "child", dziecko: "child", son: "child", daughter: "child", child: "child",
  "syn / corka": "child",
  син: "child", донька: "child", дитина: "child", дочь: "child", сын: "child", ребенок: "child", ребёнок: "child", kind: "child", sohn: "child", tochter: "child",
  // sibling
  brat: "sibling", siostra: "sibling", rodzenstwo: "sibling", brother: "sibling", sister: "sibling", sibling: "sibling",
  "brat / siostra": "sibling",
  брат: "sibling", сестра: "sibling", "брат / сестра": "sibling", bruder: "sibling", schwester: "sibling", geschwister: "sibling",
  // friends
  przyjaciel: "close_friend", przyjaciolka: "close_friend", "best friend": "close_friend",
  "przyjaciel / przyjaciolka": "close_friend",
  друг: "close_friend", подруга: "close_friend", "друг / подруга": "close_friend", "close friend": "close_friend", "enger freund": "close_friend", "enge freundin": "close_friend", "enge freundschaft": "close_friend",
  kolega: "friend", kolezanka: "friend", friend: "friend", freund: "friend", freundin: "friend", "freund/in": "friend", znajomy: "acquaintance", znajoma: "acquaintance",
  знайомий: "acquaintance", знайома: "acquaintance", "знайомий / знайома": "acquaintance", знакомый: "acquaintance", знакомая: "acquaintance", "знакомый / знакомая": "acquaintance", acquaintance: "acquaintance", bekannte: "acquaintance", bekannter: "acquaintance", "bekannte/r": "acquaintance",
  // broader relations
  rodzina: "family", family: "family", relative: "family", krewny: "family", krewna: "family",
  babcia: "family", dziadek: "family", ciocia: "family", wujek: "family", kuzyn: "family", kuzynka: "family",
  grandmother: "family", grandfather: "family", aunt: "family", uncle: "family", cousin: "family",
  родина: "family", семья: "family", familie: "family", verwandte: "family",
  praca: "work", work: "work", coworker: "work", colleague: "work", wspolpracownik: "work", wspolpracowniczka: "work",
  робота: "work", работа: "work", arbeit: "work", коллега: "work", kollege: "work", kollegin: "work",
  sasiad: "neighbor", sasiadka: "neighbor", neighbor: "neighbor", neighbour: "neighbor",
  сусід: "neighbor", сусідка: "neighbor", "сусід / сусідка": "neighbor", сосед: "neighbor", соседка: "neighbor", "сосед / соседка": "neighbor", nachbar: "neighbor", nachbarin: "neighbor", "nachbar/in": "neighbor",
  klient: "client", klientka: "client", client: "client", клієнт: "client", клієнтка: "client", "клієнт / клієнтка": "client", клиент: "client", клиентка: "client", "клиент / клиентка": "client", kunde: "client", kundin: "client", "kunde / kundin": "client",
  other: "other", inne: "other", інше: "other", другое: "other", andere: "other",
};

export function normalizeRelationValue(value: string): string {
  return value.trim().toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/\s+/g, " ");
}

/** Maps known stored labels to a canonical key; unknown text stays custom. */
export function canonicalRelationKey(
  storedKey: PersonRelationKey | null | undefined,
  storedLabel: string | null | undefined,
): PersonRelationKey | null {
  if (storedKey) return storedKey;
  const normalized = normalizeRelationValue(storedLabel ?? "");
  if (!normalized) return null;
  return LEGACY_RELATION_KEYS[normalized] ?? "other";
}
