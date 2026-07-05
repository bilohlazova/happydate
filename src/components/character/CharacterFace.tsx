import CharacterEyes from "./CharacterEyes";
import CharacterGlow from "./CharacterGlow";
import CharacterMouth from "./CharacterMouth";
import { MobileUI } from "@/lib/theme/mobile";

import type {
  CharacterMood,
  HappySessionState,
} from "@/lib/happy";

interface CharacterFaceProps {
  mood: CharacterMood;
  state: HappySessionState;
}

export default function CharacterFace({
  mood,
  state,
}: CharacterFaceProps) {
  return (
    <div
      className={`
        relative
        flex
        ${MobileUI.character}
        items-center
        justify-center
        overflow-hidden
        rounded-full
        shadow-xl
      `}
    >
      <CharacterGlow mood={mood} state={state} />

      <CharacterEyes mood={mood} />

      <CharacterMouth speaking={state === "speaking"} />
    </div>
  );
}
