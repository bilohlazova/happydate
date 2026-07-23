export type ChatPersonResolutionStatus = "none" | "resolved" | "ambiguous";

export type ChatPersonResolution = {
  status: ChatPersonResolutionStatus;
  personId: string | null;
  matchedBy: "current" | "name" | "relation" | null;
};

export type ResolveChatPersonInput = {
  userMessage: string;
  people: Array<{
    id: string;
    name: string;
    relation?: string | null;
  }>;
  currentPersonId?: string | null;
};

const NONE: ChatPersonResolution = {
  status: "none",
  personId: null,
  matchedBy: null,
};

function normalize(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string): string[] {
  return normalize(value).split(" ").filter(Boolean);
}

function containsTokenSequence(haystack: string[], needle: string[]): boolean {
  if (!needle.length || needle.length > haystack.length) return false;
  for (let index = 0; index <= haystack.length - needle.length; index += 1) {
    if (needle.every((part, offset) => haystack[index + offset] === part)) return true;
  }
  return false;
}

function uniqueValues(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function isCyrillic(value: string): boolean {
  return /[\u0400-\u04ff]/u.test(value);
}

function ukrainianFirstNameForms(firstName: string): string[] {
  const name = normalize(firstName);
  if (!name || !isCyrillic(name)) return [];

  const forms = new Set<string>();

  if (name.endsWith("ія")) {
    const stem = name.slice(0, -2);
    forms.add(`${stem}ії`);
    forms.add(`${stem}ією`);
    forms.add(`${stem}іє`);
    forms.add(`${stem}ію`);
  } else if (name.endsWith("ій")) {
    const stem = name.slice(0, -1);
    forms.add(`${stem}я`);
    forms.add(`${stem}ю`);
    forms.add(`${stem}єм`);
  } else if (name.endsWith("я")) {
    const stem = name.slice(0, -1);
    forms.add(`${stem}і`);
    forms.add(`${stem}ю`);
    forms.add(`${stem}ею`);
  } else if (name.endsWith("а")) {
    const stem = name.slice(0, -1);
    forms.add(`${stem}и`);
    forms.add(`${stem}і`);
    forms.add(`${stem}ою`);
    forms.add(`${stem}о`);
    forms.add(`${stem}у`);
  }

  forms.delete(name);
  return [...forms];
}

function ukrainianSurnameForms(lastName: string): string[] {
  const name = normalize(lastName);
  if (!name || !isCyrillic(name)) return [];

  const forms = new Set<string>();

  if (name.endsWith("енко") || name.endsWith("ко")) {
    forms.add(`${name.slice(0, -1)}а`);
  } else if (name.endsWith("ія")) {
    const stem = name.slice(0, -2);
    forms.add(`${stem}ії`);
    forms.add(`${stem}ією`);
  } else if (name.endsWith("а")) {
    const stem = name.slice(0, -1);
    forms.add(`${stem}и`);
    forms.add(`${stem}і`);
    forms.add(`${stem}ою`);
  } else if (name.endsWith("ий")) {
    const stem = name.slice(0, -2);
    forms.add(`${stem}ого`);
    forms.add(`${stem}ому`);
    forms.add(`${stem}им`);
  } else if (/[бвгґджзклмнпрстфхцчшщ]$/u.test(name)) {
    forms.add(`${name}а`);
    forms.add(`${name}у`);
    forms.add(`${name}ом`);
    forms.add(`${name}і`);
  }

  forms.delete(name);
  return [...forms];
}

function ukrainianInflectedFirstNameMatches(
  messageTokens: string[],
  people: ResolveChatPersonInput["people"],
): ResolveChatPersonInput["people"] {
  const matches = people.filter((person) => {
    const [firstName] = tokens(person.name);
    const forms = ukrainianFirstNameForms(firstName ?? "");
    return forms.some((form) => messageTokens.includes(form));
  });
  const matchedIds = new Set(matches.map((person) => person.id));
  return people.filter((person) => matchedIds.has(person.id));
}

function ukrainianInflectedFullNameMatches(
  messageTokens: string[],
  people: ResolveChatPersonInput["people"],
): ResolveChatPersonInput["people"] {
  const matches = people.filter((person) => {
    const nameTokens = tokens(person.name);
    if (nameTokens.length < 2) return false;
    const [firstName, lastName] = nameTokens;
    const firstForms = uniqueValues([firstName, ...ukrainianFirstNameForms(firstName)]);
    const lastForms = uniqueValues([lastName, ...ukrainianSurnameForms(lastName)]);
    return firstForms.some((firstForm) =>
      lastForms.some((lastForm) => containsTokenSequence(messageTokens, [firstForm, lastForm])),
    );
  });
  const matchedIds = new Set(matches.map((person) => person.id));
  return people.filter((person) => matchedIds.has(person.id));
}

function relationTokenMatches(messageToken: string, relationToken: string): boolean {
  if (messageToken === relationToken) return true;
  return relationToken.length >= 4 && messageToken === `${relationToken}а`;
}

function containsRelationSequence(haystack: string[], needle: string[]): boolean {
  if (!needle.length || needle.length > haystack.length) return false;
  for (let index = 0; index <= haystack.length - needle.length; index += 1) {
    if (needle.every((part, offset) => relationTokenMatches(haystack[index + offset], part))) {
      return true;
    }
  }
  return false;
}

function fullNameMatches(
  messageTokens: string[],
  people: ResolveChatPersonInput["people"],
): ResolveChatPersonInput["people"] {
  return people.filter((person) => {
    const nameTokens = tokens(person.name);
    return nameTokens.length > 1 && containsTokenSequence(messageTokens, nameTokens);
  });
}

function firstNameMatches(
  messageTokens: string[],
  people: ResolveChatPersonInput["people"],
): ResolveChatPersonInput["people"] {
  const matches = people.filter((person) => {
    const [firstName] = tokens(person.name);
    return Boolean(firstName) && messageTokens.includes(firstName);
  });
  const matchedIds = new Set(matches.map((person) => person.id));
  return people.filter((person) => matchedIds.has(person.id));
}

function relationMatches(
  messageTokens: string[],
  people: ResolveChatPersonInput["people"],
): ResolveChatPersonInput["people"] {
  return people.filter((person) => {
    if (!person.relation) return false;
    const relationTokens = tokens(person.relation);
    return relationTokens.length > 0 && containsRelationSequence(messageTokens, relationTokens);
  });
}

function uniqueResolution(
  matches: ResolveChatPersonInput["people"],
  matchedBy: ChatPersonResolution["matchedBy"],
): ChatPersonResolution | null {
  const ids = [...new Set(matches.map((person) => person.id))];
  if (ids.length === 1) {
    return { status: "resolved", personId: ids[0], matchedBy };
  }
  if (ids.length > 1) {
    return { status: "ambiguous", personId: null, matchedBy };
  }
  return null;
}

export function resolveChatPerson({
  userMessage,
  people,
  currentPersonId = null,
}: ResolveChatPersonInput): ChatPersonResolution {
  const messageTokens = tokens(userMessage);
  if (!messageTokens.length || !people.length) return NONE;

  const fullName = uniqueResolution(fullNameMatches(messageTokens, people), "name");
  if (fullName) return fullName;

  const firstName = uniqueResolution(firstNameMatches(messageTokens, people), "name");
  if (firstName) return firstName;

  const inflectedFullName = uniqueResolution(
    ukrainianInflectedFullNameMatches(messageTokens, people),
    "name",
  );
  if (inflectedFullName) return inflectedFullName;

  const inflectedFirstName = uniqueResolution(
    ukrainianInflectedFirstNameMatches(messageTokens, people),
    "name",
  );
  if (inflectedFirstName) return inflectedFirstName;

  const relation = uniqueResolution(relationMatches(messageTokens, people), "relation");
  if (relation) return relation;

  if (currentPersonId && people.some((person) => person.id === currentPersonId)) {
    return { status: "resolved", personId: currentPersonId, matchedBy: "current" };
  }

  return NONE;
}

export const chatPersonTestUtils = {
  normalize,
  tokens,
  ukrainianFirstNameForms,
  ukrainianSurnameForms,
};
