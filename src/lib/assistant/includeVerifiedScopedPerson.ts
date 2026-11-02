/**
 * Extend a bounded projection only for a previously server-verified person ID.
 * The caller must supply an owner-scoped loader; never use an ID from client context.
 * Returning a different ID (or no row) fails closed.
 */
export async function includeVerifiedScopedPerson<T extends { id: string }>(
  people: T[],
  verifiedPersonId: string | null,
  loadOwnedPerson: (personId: string) => Promise<T | null>,
): Promise<T[]> {
  if (!verifiedPersonId || people.some((person) => person.id === verifiedPersonId)) return people;

  const ownedPerson = await loadOwnedPerson(verifiedPersonId);
  if (!ownedPerson || ownedPerson.id !== verifiedPersonId) {
    throw new Error("Verified scoped person unavailable");
  }
  return [...people, ownedPerson];
}
