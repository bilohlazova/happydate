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

    </div>
  );
}
