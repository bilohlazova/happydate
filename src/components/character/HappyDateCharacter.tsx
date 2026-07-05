import CharacterFace from "./CharacterFace";

import type {
  CharacterMood,
  HappySessionState,
} from "@/lib/happy";

interface HappyDateCharacterProps {
  state: HappySessionState;
  mood?: CharacterMood;
}

export default function HappyDateCharacter({
  state,
  mood = "happy",
}: HappyDateCharacterProps) {
  return (
    <div className="flex flex-col items-center">
      <CharacterFace
        mood={state === "thinking" ? "thinking" : mood}
        state={state}
      />

      <h2 className="mt-5 text-xl font-bold text-sky-700">
        HappyDate
      </h2>
    </div>
  );
}
