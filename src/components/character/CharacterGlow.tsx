import type {
  CharacterMood,
  HappySessionState,
} from "@/lib/happy";

interface CharacterGlowProps {
  mood: CharacterMood;
  state: HappySessionState;
}

export default function CharacterGlow({
  mood,
  state,
}: CharacterGlowProps) {
  const gradient =
    mood === "happy"
      ? "from-sky-400 to-cyan-400"
      : mood === "calm"
      ? "from-sky-500 to-blue-500"
      : mood === "thinking"
      ? "from-violet-400 to-blue-500"
      : mood === "listening"
      ? "from-emerald-400 to-cyan-500"
      : "from-yellow-300 to-orange-400";

  return (
    <div
      className={`
        absolute
        inset-0
        rounded-full
        bg-gradient-to-br
        ${gradient}
        ${state === "thinking" ? "animate-pulse" : ""}
      `}
    />
  );
}
