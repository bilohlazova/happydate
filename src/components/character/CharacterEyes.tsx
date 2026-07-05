import type { CharacterMood } from "@/lib/happy";
import { MobileUI } from "@/lib/theme/mobile";

interface CharacterEyesProps {
  mood: CharacterMood;
}

export default function CharacterEyes({
  mood,
}: CharacterEyesProps) {
  const eyeClass =
    mood === "celebrating"
      ? "h-2 w-5 rounded-full"
      : mood === "thinking"
      ? "h-3 w-3 rounded-sm"
      : "h-3 w-3 rounded-full";

  return (
    <div
      className={`absolute ${MobileUI.characterEyesTop} flex ${MobileUI.characterEyesGap}`}
    >
      <div className={`${eyeClass} bg-white`} />
      <div className={`${eyeClass} bg-white`} />
    </div>
  );
}
