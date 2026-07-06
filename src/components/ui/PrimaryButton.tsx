import Link from "next/link";
import type { ReactNode } from "react";

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
    hd-button
    hd-button-primary
    text-white
    disabled:cursor-not-allowed
    disabled:opacity-50
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
