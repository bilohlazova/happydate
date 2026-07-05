import CharacterFace from "./CharacterFace";
import { MobileUI } from "@/lib/theme/mobile";

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

      <h2
        className={`${MobileUI.characterTitleSpacing} ${MobileUI.characterTitle} font-bold text-sky-700`}
      >
        HappyDate
      </h2>
    </div>
  );
}
