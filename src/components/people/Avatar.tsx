// src/components/people/Avatar.tsx

interface AvatarProps {
  size?: "md" | "lg";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps["size"]>, string> = {
  md: "h-16 w-16 text-3xl",
  lg: "h-20 w-20 text-4xl",
};

export default function Avatar({
  size = "lg",
  className = "",
}: AvatarProps) {
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-rose-100 ${SIZE_CLASSES[size]} ${className}`}
    >
      👤
    </div>
  );
}