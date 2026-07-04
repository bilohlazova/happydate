interface HappyDateAvatarProps {
  mood?: "happy" | "calm" | "thinking" | "listening";
  speaking?: boolean;
}

export default function HappyDateAvatar({
  mood = "happy",
  speaking = false,
}: HappyDateAvatarProps) {
  const background =
    mood === "happy"
      ? "from-sky-400 to-cyan-400"
      : mood === "calm"
      ? "from-sky-500 to-blue-500"
      : mood === "thinking"
      ? "from-violet-400 to-blue-500"
      : "from-emerald-400 to-cyan-500";

  return (
    <div className="flex flex-col items-center">
      <div
        className={`
          relative
          flex
          h-36
          w-36
          items-center
          justify-center
          rounded-full
          bg-gradient-to-br
          ${background}
          shadow-xl
          transition-all
          duration-500
          ${speaking ? "scale-105" : ""}
        `}
      >
        {/* Eyes */}
        <div className="absolute top-12 flex gap-8">
          <div className="h-3 w-3 rounded-full bg-white" />
          <div className="h-3 w-3 rounded-full bg-white" />
        </div>

        {/* Mouth */}
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
      </div>

      <p className="mt-4 text-lg font-bold text-sky-700">
        HappyDate
      </p>
    </div>
  );
}