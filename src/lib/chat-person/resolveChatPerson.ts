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
};
