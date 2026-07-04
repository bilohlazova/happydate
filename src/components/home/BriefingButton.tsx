interface BriefingButtonProps {
  disabled?: boolean;
  onClick?: () => void;
}

export default function BriefingButton({
  disabled = false,
  onClick,
}: BriefingButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`
        w-full
        rounded-2xl
        py-4
        text-lg
        font-semibold
        text-white
        transition-all
        duration-300

        ${
          disabled
            ? "cursor-not-allowed bg-gray-300"
            : `
              bg-gradient-to-r
              from-sky-500
              to-cyan-500
              shadow-lg
              hover:scale-[1.02]
              hover:shadow-xl
              active:scale-[0.98]
            `
        }
      `}
    >
      ▶ Rozpocznij dzień
    </button>
  );
}