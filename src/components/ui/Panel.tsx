import type { ReactNode } from "react";

import { THEME } from "@/lib/theme";

interface PanelProps {
  children: ReactNode;
  className?: string;
}

export default function Panel({
  children,
  className = "",
}: PanelProps) {
  return (
    <div
      className={`
        rounded-2xl
        ${THEME.brand.light}
        p-5
        ${className}
      `}
    >
      {children}
    </div>
  );
}