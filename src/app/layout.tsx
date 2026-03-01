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
          h-screen 
          overflow-hidden
          bg-slate-50
        `}
      >
        <div className="flex flex-col h-full">

          {/* HEADER */}
          <Header />

          {/* CONTENT */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>

          {/* MOBILE NAV */}
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