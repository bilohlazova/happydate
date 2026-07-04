// src/lib/people/relationship.ts

export interface RelationshipInfo {
  label: string;
  icon: string;
}

const RELATIONSHIPS: Record<string, RelationshipInfo> = {
  partner: {
    label: "Partner",
    icon: "❤️",
  },

  wife: {
    label: "Żona",
    icon: "💍",
  },

  husband: {
    label: "Mąż",
    icon: "💍",
  },

  friend: {
    label: "Przyjaciel",
    icon: "🤝",
  },

  family: {
    label: "Rodzina",
    icon: "👨‍👩‍👧",
  },

  mother: {
    label: "Mama",
    icon: "👩",
  },

  father: {
    label: "Tata",
    icon: "👨",
  },

  grandmother: {
    label: "Babcia",
    icon: "👵",
  },

  grandfather: {
    label: "Dziadek",
    icon: "👴",
  },

  child: {
    label: "Dziecko",
    icon: "👶",
  },

  coworker: {
    label: "Współpracownik",
    icon: "💼",
  },

  boss: {
    label: "Szef",
    icon: "👔",
  },

  client: {
    label: "Klient",
    icon: "🤝",
  },

  teacher: {
    label: "Nauczyciel",
    icon: "👨‍🏫",
  },

  doctor: {
    label: "Lekarz",
    icon: "🩺",
  },

  neighbor: {
    label: "Sąsiad",
    icon: "🏡",
  },
};

export function getRelationshipInfo(
  relationship: string | null
): RelationshipInfo | null {
  if (!relationship) {
    return null;
  }

  return (
    RELATIONSHIPS[
      relationship.trim().toLowerCase()
    ] ?? {
      label: relationship,
      icon: "👤",
    }
  );
}