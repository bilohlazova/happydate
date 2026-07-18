import { ASSISTANT_CHAT_CONFIG } from "./chatConfig.ts";
import type { AssistantPersonContext } from "./chatContract.ts";
import { canonicalRelationKey } from "../people/canonicalRelation.ts";
import type { PersonRelationKey } from "../repositories/person.types.ts";

export type AssistantPeopleSource = {
  id: string;
  name: string;
  relationLabel: string | null;
  relationKey?: PersonRelationKey | null;
  birthday: string | null;
  gender: "female" | "male" | "other" | "unspecified" | null;
};

function normalizedDateOnly(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function nextBirthdayOrder(birthday: string | null, now: Date): number {
  if (!birthday) return Number.POSITIVE_INFINITY;
  const [, monthText, dayText] = birthday.split("-");
  const month = Number(monthText) - 1;
  const day = Number(dayText);
  let next = new Date(now.getFullYear(), month, day);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (next < today) next = new Date(now.getFullYear() + 1, month, day);
  return next.getTime();
}

export function buildAssistantPeopleContext(
  people: AssistantPeopleSource[],
  futureEventPersonIds: ReadonlySet<string> = new Set(),
  now = new Date(),
): AssistantPersonContext[] {
  return people
    .map((person, sourceIndex) => ({
      sourceIndex,
      person: {
        id: person.id.trim(),
        name: person.name.trim(),
        relation: (() => {
          const key = canonicalRelationKey(person.relationKey, person.relationLabel);
          return key && key !== "other" ? key : person.relationLabel?.trim() || null;
        })(),
        birthday: normalizedDateOnly(person.birthday),
        gender: person.gender && person.gender !== "unspecified" ? person.gender : null,
      },
    }))
    .filter(({ person }) => person.id && person.name)
    .sort((first, second) => {
      const firstBirthday = nextBirthdayOrder(first.person.birthday, now);
      const secondBirthday = nextBirthdayOrder(second.person.birthday, now);
      const firstHasBirthday = Number.isFinite(firstBirthday);
      const secondHasBirthday = Number.isFinite(secondBirthday);
      if (firstHasBirthday !== secondHasBirthday) return firstHasBirthday ? -1 : 1;
      if (firstHasBirthday && firstBirthday !== secondBirthday) return firstBirthday - secondBirthday;

      const firstHasEvent = futureEventPersonIds.has(first.person.id);
      const secondHasEvent = futureEventPersonIds.has(second.person.id);
      if (firstHasEvent !== secondHasEvent) return firstHasEvent ? -1 : 1;

      const byName = first.person.name.localeCompare(second.person.name, undefined, { sensitivity: "base" });
      return byName || first.sourceIndex - second.sourceIndex;
    })
    .slice(0, ASSISTANT_CHAT_CONFIG.maxPeople)
    .map(({ person }) => person);
}
