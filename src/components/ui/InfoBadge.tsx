import type { ReactNode } from "react";

interface InfoBadgeProps {
  icon: string;
  children: ReactNode;
  className?: string;
}

export default function InfoBadge({
  icon,
  children,
  className = "",
}: InfoBadgeProps) {
  return (
    <div
      className={`
        inline-flex
        items-center
        gap-2
        rounded-full
        border
        border-sky-100
        bg-sky-50
        px-4
        py-2
        text-sm
        font-medium
        text-sky-700
        ${className}
      `}
    >
      <span className="text-base">
        {icon}
      </span>

      <span>{children}</span>
    </div>
  );
}