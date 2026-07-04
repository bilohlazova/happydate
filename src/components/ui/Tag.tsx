interface TagProps {
  icon?: string;
  children: React.ReactNode;
}

export default function Tag({
  icon,
  children,
}: TagProps) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700">
      {icon && <span>{icon}</span>}

      <span>{children}</span>
    </span>
  );
}