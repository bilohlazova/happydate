import type { ReactNode } from "react";

interface GreetingBubbleProps {
  children: ReactNode;
}

export default function GreetingBubble({
  children,
}: GreetingBubbleProps) {
  return (
    <div className="relative w-full">
      {/* Bubble */}
      <div
        className="
          rounded-3xl
          border
          border-sky-100
          bg-white
          p-6
          shadow-sm
        "
      >
        <div className="space-y-3 text-center">
          {children}
        </div>
      </div>

      {/* Tail */}
      <div
        className="
          absolute
          left-1/2
          top-0
          h-4
          w-4
          -translate-x-1/2
          -translate-y-2
          rotate-45
          border-l
          border-t
          border-sky-100
          bg-white
        "
      />
    </div>
  );
}