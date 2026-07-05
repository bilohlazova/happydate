import type { PersonSummary } from "./people.types";

export async function getPeople(): Promise<PersonSummary[]> {
  return [
    {
      id: "1",

      firstName: "Anna",

      birthday: new Date("2026-07-09"),

      relationship: "Friend",

      favoriteThings: ["Tulips", "Coffee"],
    },
  ];
}