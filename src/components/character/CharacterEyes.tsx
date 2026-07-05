import type { CharacterMood } from "@/lib/happy";

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
    <div className="absolute top-12 flex gap-8">
      <div className={`${eyeClass} bg-white`} />
      <div className={`${eyeClass} bg-white`} />
    </div>
  );
}
