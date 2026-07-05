"use client";

import HomeHero from "@/components/home/HomeHero";
import Link from "next/link";
import { useEffect, useState } from "react";

const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // noop
    }
  },
};

function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (!safeStorage.getItem("happydate_cookie_consent")) {
        setVisible(true);
      }
    });

    return () => cancelAnimationFrame(id);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "rgba(20,20,20,0.95)",
        color: "#fff",
        padding: "13px 20px",
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: 600,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <p style={{ fontSize: 13, margin: 0 }}>
          Używamy cookies zgodnie z{" "}
          <Link
            href="/privacy"
            style={{ color: "#60a5fa", textDecoration: "underline" }}
          >
            Polityką Prywatności
          </Link>
          .
        </p>
        <button
          onClick={() => {
            safeStorage.setItem("happydate_cookie_consent", "true");
            setVisible(false);
          }}
          style={{
            background: "#3a9bd5",
            color: "#fff",
            border: "none",
            padding: "7px 16px",
            borderRadius: "var(--border-radius-md)",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Akceptuję
        </button>
      </div>
    </div>
  );
}

export default function HomePageClient() {
  return (
    <main
      style={{
        background: "var(--color-background-tertiary)",
        minHeight: "100vh",
        WebkitOverflowScrolling: "touch",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          maxWidth: 520,
          margin: "0 auto",
          padding: "10px 16px 24px",
        }}
      >
        <HomeHero />
      </div>

      <CookieConsent />
    </main>
  );
}
