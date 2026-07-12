import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "react-big-calendar/lib/css/react-big-calendar.css";

import AppShell from "@/components/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HappyDate",
  description: "Twój ciepły asystent prezentowy",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // ✅ дозволяє контенту заходити під notch/Dynamic Island
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl" className="h-full">
      <body
        className={`
          ${geistSans.variable}
          ${geistMono.variable}
          antialiased
          hd-app-shell
        `}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
