import Link from "next/link";
import type { ReactNode } from "react";

import { THEME } from "@/lib/theme";

interface PrimaryButtonProps {
  children: ReactNode;
  href?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export default function PrimaryButton({
  children,
  href,
  type = "button",
  onClick,
  className = "",
  disabled = false,
}: PrimaryButtonProps) {
  const classes = `
    inline-flex
    items-center
    justify-center
    rounded-2xl
    px-5
    py-3
    text-sm
    font-semibold
    text-white
    transition-all
    duration-200
    ${THEME.brand.gradient}
    hover:scale-[1.02]
    active:scale-[0.98]
    disabled:cursor-not-allowed
    disabled:opacity-50
    ${THEME.card.shadow}
    ${className}
  `;

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes}
    >
      {children}
    </button>
  );
}