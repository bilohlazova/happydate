// src/components/people/Avatar.tsx

import Image from "next/image";

import { THEME } from "@/lib/theme";

interface AvatarProps {
  name: string;
  photoUrl?: string | null;
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
        ${THEME.brand.gradientDiagonal}
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