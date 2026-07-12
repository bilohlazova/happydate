import type {
  PersonGender,
  PersonRelationCategory,
  PersonRelationKey,
  PersonRow,
} from "@/lib/repositories/person.types";

export type RelationCategory = PersonRelationCategory;
export type RelationKey = PersonRelationKey;

export interface RelationOption {
  key: RelationKey;
  label: string;
  category: RelationCategory;
  aliases: string[];
  labels: {
    female?: string;
    male?: string;
    neutral: string;
  };
}

export const RELATION_OPTIONS: RelationOption[] = [
  {
    key: "spouse",
    label: "Mąż / Żona",
    category: "partner",
    aliases: ["maz", "zona", "malzonek", "malzonka"],
    labels: { female: "Żona", male: "Mąż", neutral: "Mąż / Żona" },
  },
  {
    key: "partner",
    label: "Partner / Partnerka",
    category: "partner",
    aliases: ["partner", "partnerka", "chlopak", "dziewczyna", "narzeczony", "narzeczona"],
    labels: { female: "Partnerka", male: "Partner", neutral: "Partner / Partnerka" },
  },
  {
    key: "parent",
    label: "Mama / Tata",
    category: "close_family",
    aliases: ["mama", "matka", "tata", "ojciec"],
    labels: { female: "Mama", male: "Tata", neutral: "Mama / Tata" },
  },
  {
    key: "child",
    label: "Syn / Córka",
    category: "children",
    aliases: ["syn", "corka", "dziecko"],
    labels: { female: "Córka", male: "Syn", neutral: "Syn / Córka" },
  },
  {
    key: "sibling",
    label: "Brat / Siostra",
    category: "close_family",
    aliases: ["brat", "siostra", "rodzenstwo"],
    labels: { female: "Siostra", male: "Brat", neutral: "Brat / Siostra" },
  },
  {
    key: "close_friend",
    label: "Przyjaciel / Przyjaciółka",
    category: "friends",
    aliases: ["przyjaciel", "przyjaciolka", "best friend"],
    labels: {
      female: "Przyjaciółka",
      male: "Przyjaciel",
      neutral: "Przyjaciel / Przyjaciółka",
    },
  },
  {
    key: "friend",
    label: "Kolega / Koleżanka",
    category: "friends",
    aliases: ["kolega", "kolezanka", "znajomy z pracy", "znajoma z pracy"],
    labels: { female: "Koleżanka", male: "Kolega", neutral: "Kolega / Koleżanka" },
  },
  {
    key: "family",
    label: "Rodzina",
    category: "family",
    aliases: ["rodzina", "family", "ciocia", "wujek", "kuzyn", "kuzynka", "babcia", "dziadek"],
    labels: { neutral: "Rodzina" },
  },
  {
    key: "work",
    label: "Praca",
    category: "work",
    aliases: ["praca", "work", "wspolpracownik", "wspolpracowniczka", "szef", "szefowa"],
    labels: { neutral: "Praca" },
  },
  {
    key: "acquaintance",
    label: "Znajomy / Znajoma",
    category: "acquaintances",
    aliases: ["znajomy", "znajoma"],
    labels: { female: "Znajoma", male: "Znajomy", neutral: "Znajomy / Znajoma" },
  },
  {
    key: "neighbor",
    label: "Sąsiad / Sąsiadka",
    category: "neighbors",
    aliases: ["sasiad", "sasiadka"],
    labels: { female: "Sąsiadka", male: "Sąsiad", neutral: "Sąsiad / Sąsiadka" },
  },
  {
    key: "client",
    label: "Klient / Klientka",
    category: "clients",
    aliases: ["klient", "klientka"],
    labels: { female: "Klientka", male: "Klient", neutral: "Klient / Klientka" },
  },
  {
    key: "other",
    label: "Inne",
    category: "other",
    aliases: [],
    labels: { neutral: "Inne" },
  },
];

const RELATION_BY_KEY = new Map(
  RELATION_OPTIONS.map((option) => [option.key, option])
);

export function getRelationDefinition(key: RelationKey | null | undefined) {
  return key ? RELATION_BY_KEY.get(key) ?? null : null;
}

export function getRelationLabel(
  relationKey: RelationKey | null | undefined,
  gender: PersonGender | null | undefined,
  customLabel?: string | null
) {
  const definition = getRelationDefinition(relationKey);

  if (!definition) return customLabel?.trim() ?? "";

  if (definition.key === "other") {
    return customLabel?.trim() ?? "";
  }

  if (gender === "female" && definition.labels.female) {
    return definition.labels.female;
  }

  if (gender === "male" && definition.labels.male) {
    return definition.labels.male;
  }

  return definition.labels.neutral;
}

export function getRelationCategoryForKey(
  relationKey: RelationKey | null | undefined
): RelationCategory | null {
  return getRelationDefinition(relationKey)?.category ?? null;
}

export function getPersonRelationKey(person: PersonRow): RelationKey | null {
  return person.relation_key ?? inferRelationKey(person);
}

export function getPersonRelationLabel(person: PersonRow) {
  const key = getPersonRelationKey(person);

  if (!key) {
    return person.relation_label ?? person.relationship ?? "";
  }

  if (
    !person.relation_key &&
    (person.gender ?? "unspecified") === "unspecified" &&
    key !== "other"
  ) {
    return person.relation_label ?? person.relationship ?? getRelationLabel(key, person.gender);
  }

  return getRelationLabel(
    key,
    person.gender,
    person.relation_label ?? person.relationship
  );
}

export function getPersonRelationSearchAliases(person: PersonRow) {
  const key = getPersonRelationKey(person);
  const definition = getRelationDefinition(key);

  if (!definition) return [];

  return [
    definition.label,
    definition.labels.female,
    definition.labels.male,
    definition.labels.neutral,
    ...definition.aliases,
  ].filter(Boolean) as string[];
}

export function getPersonRelationCategory(person: PersonRow): RelationCategory {
  const keyCategory = getRelationCategoryForKey(getPersonRelationKey(person));

  if (keyCategory) {
    return keyCategory;
  }

  if (person.relation_category) {
    return person.relation_category;
  }

  return getRelationCategoryForLabel(person.relation_label ?? person.relationship);
}

export function getRelationCategoryForLabel(label: string | null): RelationCategory {
  return getRelationCategoryForKey(inferRelationKeyFromLabel(label)) ?? "other";
}

export function inferRelationKey(person: PersonRow): RelationKey | null {
  return inferRelationKeyFromLabel(person.relation_label ?? person.relationship);
}

export function inferRelationKeyFromLabel(label: string | null | undefined): RelationKey | null {
  const normalized = normalizeSearchValue(label ?? "");

  if (!normalized) return null;

  for (const option of RELATION_OPTIONS) {
    const labels = [
      option.label,
      option.labels.female,
      option.labels.male,
      option.labels.neutral,
      ...option.aliases,
    ].filter(Boolean) as string[];

    if (labels.some((candidate) => normalizeSearchValue(candidate) === normalized)) {
      return option.key;
    }
  }

  for (const option of RELATION_OPTIONS) {
    if (option.aliases.some((alias) => normalized.includes(alias))) {
      return option.key;
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
