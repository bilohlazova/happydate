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
        top-20
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
