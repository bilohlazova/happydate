import CharacterEyes from "./CharacterEyes";
import CharacterGlow from "./CharacterGlow";
import CharacterMouth from "./CharacterMouth";

import type { CharacterState } from "./Character.types";

interface CharacterFaceProps {
  state: CharacterState;
}

export default function CharacterFace({
  state,
}: CharacterFaceProps) {
  return (
    <div
      className="
        relative
        flex
        h-36
        w-36
        items-center
        justify-center
        overflow-hidden
        rounded-full
        shadow-xl
      "
    >
      <CharacterGlow mood={state.mood} />

      <CharacterEyes mood={state.mood} />

      <CharacterMouth speaking={state.speaking} />
    </div>
  );
}