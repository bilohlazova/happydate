// src/components/people/Avatar.tsx

import Image from "next/image";

import { THEME } from "@/lib/theme";

type AvatarColorToken = "blue" | "pink" | "green" | "purple" | "orange";

interface AvatarProps {
  name: string;
  photoUrl?: string | null;
  colorToken?: string | null;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function Avatar({
  name,
  photoUrl,
  colorToken,
  className = "",
}: AvatarProps) {
  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt={name}
        width={96}
        height={96}
        className={`
          h-24
          w-24
          rounded-full
          object-cover
          ring-4
          ring-white
          shadow-xl
          ${className}
        `}
      />
    );
  }

  return (
    <div
      className={`
        flex
        h-24
        w-24
        items-center
        justify-center
        rounded-full
        ${getAvatarColorClass(colorToken)}
        text-3xl
        font-extrabold
        tracking-wide
        text-white
        shadow-xl
        ring-4
        ring-white
        select-none
        transition-transform
        duration-200
        ${className}
      `}
    >
      {getInitials(name)}
    </div>
  );
}

function getAvatarColorClass(colorToken?: string | null): string {
  const colors: Record<AvatarColorToken, string> = {
    blue: "bg-gradient-to-br from-sky-400 to-blue-600",
    pink: "bg-gradient-to-br from-pink-400 to-rose-600",
    green: "bg-gradient-to-br from-emerald-400 to-green-600",
    purple: "bg-gradient-to-br from-violet-400 to-purple-600",
    orange: "bg-gradient-to-br from-amber-400 to-orange-600",
  };

  if (
    colorToken === "blue" ||
    colorToken === "pink" ||
    colorToken === "green" ||
    colorToken === "purple" ||
    colorToken === "orange"
  ) {
    return colors[colorToken];
  }

  return THEME.brand.gradientDiagonal;
}
