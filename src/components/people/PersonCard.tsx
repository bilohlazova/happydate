// src/components/people/PersonCard.tsx

import Link from "next/link";

import Avatar from "@/components/people/Avatar";
import type { PersonRow } from "@/lib/repositories/person.types";

interface PersonCardProps {
  person: PersonRow;
}

export default function PersonCard({
  person,
}: PersonCardProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-5">
          <Avatar />

          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {person.name}
            </h1>

            {person.relationship && (
              <p className="mt-2 text-sm text-gray-600">
                ❤️ {person.relationship}
              </p>
            )}

            {person.birthday && (
              <p className="mt-1 text-sm text-gray-600">
                🎂 {person.birthday}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 md:min-w-[190px]">
          <Link
            href={`/care/add-memory?personId=${person.id}`}
            className="rounded-lg bg-rose-500 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-rose-600"
          >
            ➕ Dodaj wspomnienie
          </Link>

          <button
            type="button"
            disabled
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-500 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            ✏️ Edytuj
          </button>
        </div>
      </div>

      {person.notes && (
        <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50 p-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">
            📝 Notatki
          </h2>

          <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
            {person.notes}
          </p>
        </div>
      )}
    </section>
  );
}