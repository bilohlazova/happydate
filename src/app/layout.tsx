import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "react-big-calendar/lib/css/react-big-calendar.css";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";

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
        <div className="flex min-h-screen flex-col">

          {/* HEADER — сам розтягується під статус-бар через paddingTop у Header.tsx */}
          <Header />

          {/* CONTENT */}
          <main className="hd-main">
            {children}
          </main>

          {/* MOBILE NAV (FIXED) */}
          <div className="md:hidden">
            <BottomNav />
          </div>

          {/* DESKTOP FOOTER */}
          <div className="hidden md:block">
            <Footer />
          </div>

        </div>
      </body>
    </html>
  );
}
