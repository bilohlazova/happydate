import { canonicalRelationKey } from "../people/canonicalRelation.ts";
import type {
  PersonGender,
  PersonRelationKey,
} from "./person.types.ts";
import type { OwnedGiftPerson } from "./giftIntelligenceRepository.server.ts";

export interface OwnedGiftPersonRow {
  id: string;
  user_id: string;
  name: string | null;
  relationship: string | null;
  relation_label: string | null;
  relation_key: PersonRelationKey | null;
  gender: PersonGender | null;
  birthday: string | null;
}

export function mapOwnedGiftPersonRow(row: OwnedGiftPersonRow): OwnedGiftPerson {
  const relation = row.relation_label ?? row.relationship ?? null;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name ?? null,
    relation,
    relationKey: canonicalRelationKey(row.relation_key, relation),
    gender: row.gender ?? "unspecified",
    birthday: row.birthday ?? null,
  };
}
