import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTimeZone } from "next-intl/server";
import "./globals.css";
import "react-big-calendar/lib/css/react-big-calendar.css";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import { getAppMetadata } from "@/i18n/metadata";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext", "cyrillic"],
});

export async function generateMetadata(): Promise<Metadata> {
  return getAppMetadata(await getLocale());
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // ✅ дозволяє контенту заходити під notch/Dynamic Island
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  const timeZone = await getTimeZone();

  return (
    <html lang={locale} className="h-full">
      <body
        className={`
          ${geistSans.variable}
          ${geistMono.variable}
          antialiased
          hd-app-shell
        `}
      >
        <NextIntlClientProvider
          locale={locale}
          messages={messages}
          timeZone={timeZone}
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
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
