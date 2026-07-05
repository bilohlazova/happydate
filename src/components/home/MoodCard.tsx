import { MobileUI } from "@/lib/theme/mobile";

interface MoodCardProps {
  icon: string;
  title: string;
  subtitle: string;
  selected?: boolean;
  onClick?: () => void;
}

export default function MoodCard({
  icon,
  title,
  subtitle,
  selected = false,
  onClick,
}: MoodCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full
        rounded-2xl
        border
        ${MobileUI.cardPadding}
        text-left
        transition-all
        duration-300
        ${
          selected
            ? "border-sky-500 bg-sky-50 shadow-md scale-[1.02]"
            : "border-gray-200 bg-white hover:border-sky-300 hover:shadow-sm"
        }
      `}
    >
      <div className="flex items-start gap-4">
        <div className={MobileUI.cardIcon}>
          {icon}
        </div>

        <div className="flex-1">
          <h3 className={`${MobileUI.body} font-semibold text-gray-900`}>
            {title}
          </h3>

          <p className={`mt-1 ${MobileUI.caption} leading-6 text-gray-500`}>
            {subtitle}
          </p>
        </div>

        {selected && (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-sm text-white">
            ✓
          </div>
        )}
      </div>
    </button>
  );
}
