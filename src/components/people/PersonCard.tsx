import Avatar from "@/components/people/Avatar";

import Card from "@/components/ui/Card";
import InfoBadge from "@/components/ui/InfoBadge";
import Panel from "@/components/ui/Panel";

import type { PersonRow } from "@/lib/repositories/person.types";
import { getRelationshipInfo } from "@/lib/people/relationship";

interface PersonCardProps {
  person: PersonRow;
}

function formatBirthday(date: string | null): string | null {
  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "long",
  }).format(new Date(date));
}

export default function PersonCard({
  person,
}: PersonCardProps) {
  const relationship = getRelationshipInfo(
    person.relationship
  );

  const birthday = formatBirthday(
    person.birthday
  );

  return (
    <Card className="p-6">
      <div className="flex flex-col items-center text-center">
        <Avatar name={person.name} />

        <h1 className="mt-5 text-3xl font-bold text-gray-900">
          {person.name}
        </h1>

        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {relationship && (
            <InfoBadge icon={relationship.icon}>
              {relationship.label}
            </InfoBadge>
          )}

          {birthday && (
            <InfoBadge icon="🎂">
              {birthday}
            </InfoBadge>
          )}
        </div>
      </div>

      {person.notes && (
        <Panel className="mt-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Notatki
          </h2>

          <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">
            {person.notes}
          </p>
        </Panel>
      )}
    </Card>
  );
}