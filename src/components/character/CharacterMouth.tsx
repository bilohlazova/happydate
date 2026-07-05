import { MobileUI } from "@/lib/theme/mobile";

interface CharacterMouthProps {
  speaking: boolean;
}

export default function CharacterMouth({
  speaking,
}: CharacterMouthProps) {
  return (
    <div
      className={`
        absolute
        ${MobileUI.characterMouthTop}
        bg-white
        transition-all
        duration-200
        ${
          speaking
            ? "h-3 w-8 rounded-lg"
            : "h-2 w-6 rounded-full"
        }
      `}
    />
  );
}
