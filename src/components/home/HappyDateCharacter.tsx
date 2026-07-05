import CharacterFace from "./character/CharacterFace";

import type {
  CharacterMood,
} from "./character/Character.types";

interface HappyDateCharacterProps {
  mood?: CharacterMood;
  speaking?: boolean;
}

export default function HappyDateCharacter({
  mood = "happy",
  speaking = false,
}: HappyDateCharacterProps) {
  return (
    <div className="flex flex-col items-center">
      <CharacterFace
        state={{
          mood,
          speaking,
        }}
      />

      <h2 className="mt-5 text-xl font-bold text-sky-700">
        HappyDate
      </h2>
    </div>
  );
}