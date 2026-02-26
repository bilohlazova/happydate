import type { Metadata } from "next";
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
          h-full 
          bg-slate-50
        `}
      >
        <div className="flex flex-col min-h-screen">

          {/* Header */}
          <Header />

          {/* Main content */}
          <main className="flex-1 pb-20">
            {children}
          </main>

          {/* Bottom nav – тільки mobile */}
          <div className="md:hidden">
            <BottomNav />
          </div>

          {/* Footer – тільки desktop */}
          <div className="hidden md:block">
            <Footer />
          </div>

        </div>
      </body>
    </html>
  );
}