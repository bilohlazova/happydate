import type { PersonRow } from "../person.types";
import type { PersonSummary } from "./people.types";

export function projectPersonSummary(row: PersonRow): PersonSummary {
  return {
    id: row.id,
    firstName: row.name,
    birthday: row.birthday ? new Date(`${row.birthday}T00:00:00`) : undefined,
    relationship: row.relation_label ?? row.relationship ?? undefined,
    favoriteThings: [],
    lastContactAt: undefined,
  };
}
