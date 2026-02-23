"use client";

import { ReactNode } from "react";

type ServiceSectionProps = {
  id?: string;
  emoji?: string;
  title: string;
  intro?: string | ReactNode;
  /** Доступні варіанти смужки-градієнта під заголовком */
  gradient?: "pink" | "blue" | "green" | "mixed" | "yellow";
  /** Тут рендеримо <ServiceCard /> */
  children: ReactNode;
};

const barByGradient: Record<NonNullable<ServiceSectionProps["gradient"]>, string> = {
  pink: "from-pink-500 via-yellow-400 to-pink-500",
  blue: "from-blue-500 via-yellow-400 to-blue-500",
  green: "from-pink-500 via-green-400 to-blue-500",
  mixed: "from-pink-500 via-indigo-500 to-blue-500",
  yellow: "from-yellow-400 via-pink-400 to-yellow-400",
};

export function ServiceSection({
  id,
  emoji,
  title,
  intro,
  gradient = "pink",
  children,
}: ServiceSectionProps) {
  return (
    <section
      id={id}
      className="bg-gradient-to-br from-white via-white to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-20"
    >
      <div className="max-w-7xl mx-auto px-4">
        <div
          className={`h-1 w-24 bg-gradient-to-r ${barByGradient[gradient]} rounded-full mx-auto mb-6`}
          aria-hidden="true"
        />
        <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-gray-900 dark:text-white text-center flex items-center justify-center gap-2">
          {emoji && <span className="text-2xl" aria-hidden="true">{emoji}</span>}
          <span>{title}</span>
        </h2>
        {intro && (
          <p className="text-center text-lg text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            {intro}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">{children}</div>
      </div>
    </section>
  );
}
