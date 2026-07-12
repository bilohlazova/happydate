import type { PersonRow } from "@/lib/repositories/person.types";

export type RelationCategory =
  | "partner"
  | "close_family"
  | "children"
  | "friends"
  | "work"
  | "acquaintances"
  | "neighbors"
  | "clients"
  | "family"
  | "other";

export interface RelationOption {
  label: string;
  category: RelationCategory;
}

export const RELATION_OPTIONS: RelationOption[] = [
  { label: "Mąż", category: "partner" },
  { label: "Żona", category: "partner" },
  { label: "Partner", category: "partner" },
  { label: "Partnerka", category: "partner" },
  { label: "Mama", category: "close_family" },
  { label: "Tata", category: "close_family" },
  { label: "Syn", category: "children" },
  { label: "Córka", category: "children" },
  { label: "Siostra", category: "close_family" },
  { label: "Brat", category: "close_family" },
  { label: "Przyjaciel", category: "friends" },
  { label: "Przyjaciółka", category: "friends" },
  { label: "Kolega", category: "friends" },
  { label: "Koleżanka", category: "friends" },
  { label: "Rodzina", category: "family" },
  { label: "Praca", category: "work" },
  { label: "Znajomy", category: "acquaintances" },
  { label: "Znajoma", category: "acquaintances" },
  { label: "Sąsiad", category: "neighbors" },
  { label: "Sąsiadka", category: "neighbors" },
  { label: "Klient", category: "clients" },
  { label: "Klientka", category: "clients" },
  { label: "Inne", category: "other" },
];

const RELATION_KEYWORDS: Record<RelationCategory, string[]> = {
  partner: [
    "maz",
    "zona",
    "partner",
    "partnerka",
    "chlopak",
    "dziewczyna",
    "narzeczony",
    "narzeczona",
  ],
  close_family: [
    "mama",
    "matka",
    "tata",
    "ojciec",
    "siostra",
    "brat",
    "babcia",
    "dziadek",
  ],
  children: ["syn", "corka"],
  friends: [
    "przyjaciel",
    "przyjaciolka",
    "znajomy",
    "znajoma",
    "friend",
    "kolega",
    "kolezanka",
  ],
  work: ["praca", "work", "wspolpracownik", "wspolpracowniczka", "szef", "szefowa"],
  acquaintances: ["znajomy", "znajoma"],
  neighbors: ["sasiad", "sasiadka"],
  clients: ["klient", "klientka"],
  family: ["rodzina", "family", "ciocia", "wujek", "kuzyn", "kuzynka"],
  other: [],
};

export function getPersonRelationLabel(person: PersonRow) {
  return person.relation_label ?? person.relationship ?? "";
}

export function getPersonRelationCategory(person: PersonRow): RelationCategory {
  if (person.relation_category) {
    return person.relation_category;
  }

  return getRelationCategoryForLabel(getPersonRelationLabel(person));
}

export function getRelationCategoryForLabel(label: string | null): RelationCategory {
  const normalized = normalizeSearchValue(label ?? "");
  const predefined = RELATION_OPTIONS.find(
    (option) => normalizeSearchValue(option.label) === normalized
  );

  if (predefined) return predefined.category;

  for (const [category, keywords] of Object.entries(RELATION_KEYWORDS)) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return category as RelationCategory;
    }
  }

  return "other";
}

function normalizeSearchValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/\s+/g, " ");
}
