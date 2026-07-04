import type { ReactNode } from "react";

import { THEME } from "@/lib/theme";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({
  children,
  className = "",
}: CardProps) {
  return (
    <section
      className={`
        ${THEME.card.base}
        ${THEME.card.shadow}
        ${className}
      `}
    >
      {children}
    </section>
  );
}