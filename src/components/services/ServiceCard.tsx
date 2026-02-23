"use client";

import Link from "next/link";

type ServiceCardProps = {
  emoji?: string;
  title: string;
  description: string;
  href?: string;
  accent?: "pink" | "blue" | "yellow" | "indigo" | "green" | "red";
  badge?: string;
  external?: boolean;
  ctaLabel?: string; // ✅ новий проп
};

const accentToHover: Record<NonNullable<ServiceCardProps["accent"]>, string> = {
  pink: "group-hover:text-pink-500",
  blue: "group-hover:text-blue-500",
  yellow: "group-hover:text-yellow-500",
  indigo: "group-hover:text-indigo-500",
  green: "group-hover:text-green-500",
  red: "group-hover:text-red-500",
};

const accentToBtn: Record<NonNullable<ServiceCardProps["accent"]>, string> = {
  pink: "bg-pink-500 hover:bg-pink-600 focus:ring-pink-300",
  blue: "bg-blue-500 hover:bg-blue-600 focus:ring-blue-400",
  yellow: "bg-yellow-400 text-gray-900 hover:bg-yellow-500 focus:ring-yellow-300",
  indigo: "bg-indigo-500 hover:bg-indigo-600 focus:ring-indigo-400",
  green: "bg-green-400 hover:bg-green-500 focus:ring-green-300",
  red: "bg-red-500 hover:bg-red-600 focus:ring-red-400",
};

export function ServiceCard({
  emoji,
  title,
  description,
  href = "#",
  accent = "pink",
  badge,
  external = false,
  ctaLabel, // ✅ приймаємо проп
}: ServiceCardProps) {
  const CardInner = (
    <div className="relative bg-white/80 dark:bg-gray-800/70 backdrop-blur-lg rounded-2xl shadow-md hover:shadow-xl transition transform hover:scale-105 text-center p-8 group h-full">
      {badge && (
        <div className="absolute top-3 right-3 bg-pink-500 text-white text-xs px-3 py-1 rounded-full shadow">
          {badge}
        </div>
      )}

      <h3
        className={`text-xl font-bold mb-3 flex justify-center items-center gap-2 ${accentToHover[accent]}`}
      >
        {emoji && <span aria-hidden="true">{emoji}</span>}
        <span>{title}</span>
      </h3>

      <p className="mb-4 text-gray-700 dark:text-gray-200 leading-relaxed">
        {description}
      </p>

      <span
        className={`inline-block mt-2 px-6 py-2 rounded-xl text-white font-semibold shadow transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${accentToBtn[accent]}`}
      >
        {ctaLabel ? ctaLabel : "Dowiedz się więcej →"}
      </span>
    </div>
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="h-full block"
      >
        {CardInner}
      </a>
    );
  }

  return (
    <Link href={href} className="h-full block">
      {CardInner}
    </Link>
  );
}
