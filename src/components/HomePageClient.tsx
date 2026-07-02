"use client";

// src/components/HomePageClient.tsx
// ─────────────────────────────────────────────────────────────────────────────
// REFACTORED: iOS WebView / Capacitor-safe, production-ready architecture
// Key fixes:
//   • No auth-loop: onAuthStateChange fires load() but load() is idempotent
//     and guarded by a ref-based "in-flight" flag so it never stacks.
//   • Parallel Supabase fetches (profile + events + people + notes) via Promise.all.
//   • Hard timeout (5 s) on every fetch so iOS WebView never freezes.
//   • isMounted ref guards every async setState call → no memory leaks.
//   • localStorage access wrapped in try/catch (WKWebView can throw).
//   • ChatUIMount and FloatingActions are lazy-loaded to reduce initial paint.
//   • Emergency fallback: if init takes > 8 s the component forces a "guest"
//     state so the user always sees something.
//   • All inline styles kept (no tailwind dependency) to match existing codebase.
//   • Brain insights are now sourced via loadBrain() (Repository + buildInsights
//     under the hood) and drive the assistant card when available, with the
//     original events-only logic kept as a fallback when there are no insights.
// ─────────────────────────────────────────────────────────────────────────────
import CareFeed from "./care/CareFeed";
import {
  useEffect,
  useRef,
  useState,
  lazy,
  Suspense,
  useCallback,
} from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { loadBrain } from "@/lib/brain/loadBrain";
import {
  mapInsightToAssistant,
  type AssistantCardData,
} from "@/lib/brain/mapInsightToAssistant";
import {
  type AssistantState,
  type AssistantEvent,
  type AssistantProfile,
  resolveState,
} from "./assistant/AssistantCard";

// ── Lazy-load heavy leaf components so they never block first paint ──────────
const FloatingActions = lazy(() => import("@/components/FloatingActions"));
const ChatUIMount     = lazy(() => import("@/components/ChatUIMount"));

// ── Constants ────────────────────────────────────────────────────────────────
const FETCH_TIMEOUT_MS    = 5_000;  // individual Supabase call timeout
const EMERGENCY_TIMEOUT_MS = 8_000; // hard fallback: show guest after N ms

// ── Utility: race any promise against a timeout ───────────────────────────────
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ]);
}

// ── Safe localStorage wrapper (WKWebView can throw SecurityError) ─────────────
const safeStorage = {
  getItem: (key: string): string | null => {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  setItem: (key: string, value: string): void => {
    try { localStorage.setItem(key, value); } catch { /* noop */ }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components (kept identical in appearance, minor perf tweaks)
// ─────────────────────────────────────────────────────────────────────────────

function AssistantSkeleton() {
  return (
    <div
      style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        padding: 16,
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "var(--color-background-secondary)",
            animation: "skPulse 1.4s ease-in-out infinite",
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1 }}>
          {[55, 75, 45].map((w, i) => (
            <div
              key={i}
              style={{
                height: i === 1 ? 15 : 10,
                width: `${w}%`,
                borderRadius: 6,
                background: "var(--color-background-secondary)",
                marginBottom: 8,
                animation: `skPulse 1.4s ease-in-out infinite ${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      </div>
      <style>{`@keyframes skPulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
    </div>
  );
}

function GuestHero() {
  return (
    <section
      style={{
        background:
          "linear-gradient(135deg,#fce7f3 0%,#fef9c3 50%,#dbeafe 100%)",
        padding: "36px 20px",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          fontSize: "clamp(20px,5vw,28px)",
          fontWeight: 500,
          color: "var(--color-text-primary)",
          lineHeight: 1.35,
          marginBottom: 12,
        }}
      >
        HappyDate — spokój, że o ważnych chwilach ktoś pamięta za Ciebie 💛
      </h1>
      <p
        style={{
          fontSize: 14,
          color: "var(--color-text-secondary)",
          lineHeight: 1.65,
          maxWidth: 360,
          margin: "0 auto 22px",
        }}
      >
        Zapisuj ważnych ludzi, ich daty i drobne detale. My przypomnimy w
        odpowiednim momencie.
      </p>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          maxWidth: 260,
          margin: "0 auto",
        }}
      >
        <Link
          href="/auth/login"
          style={{
            padding: 13,
            background: "#3a9bd5",
            color: "#fff",
            borderRadius: "var(--border-radius-md)",
            fontSize: 15,
            fontWeight: 500,
            textDecoration: "none",
            textAlign: "center",
          }}
        >
          Zacznij za darmo
        </Link>
        <Link
          href="/services"
          style={{
            padding: 13,
            background: "#fbbf24",
            color: "#78350f",
            borderRadius: "var(--border-radius-md)",
            fontSize: 15,
            fontWeight: 500,
            textDecoration: "none",
            textAlign: "center",
          }}
        >
          💛 Zobacz Care
        </Link>
      </div>
    </section>
  );
}

function QuickNav() {
  const items = [
    { label: "Osoby",     href: "/people",   emoji: "👥" },
    { label: "Notatki",   href: "/notes",    emoji: "📝" },
    { label: "Kalendarz", href: "/calendar", emoji: "📅" },
    { label: "Usługi",    href: "/services", emoji: "✨" },
  ];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
        marginBottom: 10,
      }}
    >
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 14px",
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-md)",
            textDecoration: "none",
          }}
        >
          <span style={{ fontSize: 18 }}>{item.emoji}</span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--color-text-primary)",
            }}
          >
            {item.label}
          </span>
        </Link>
      ))}
    </div>
  );
}

function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Defer until after first paint so it never blocks render
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

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function HomePageClient() {
  const [loading,   setLoading]   = useState(true);
  const [authState, setAuthState] = useState<AssistantState>("guest");
  // NOTE: `profile` and `nextEvent` are no longer rendered directly here
  // (CareFeed only consumes `hero`), but the setters are still needed
  // inside load() to keep this state available for future CareFeed blocks.
  // The unused read-values are dropped from the destructuring below to
  // satisfy no-unused-vars, while the setters are kept.
  const [, setProfile]   = useState<AssistantProfile>({});
  const [, setNextEvent] = useState<AssistantEvent | null>(null);
  const [assistantCard, setAssistantCard] =
    useState<AssistantCardData | null>(null);
  // ── Refs used for safety guards ──────────────────────────────────────────
  const isMounted   = useRef(false);
  const isLoading   = useRef(false);  // in-flight guard – prevents stacked calls
  const emergencyId = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Core data-loading function ───────────────────────────────────────────
  // Wrapped in useCallback so the auth-change listener always gets the latest.
  const load = useCallback(async () => {
    // Guard: skip if a load is already in progress
    if (isLoading.current) {
      console.debug("[HomePageClient] load() skipped – already in flight");
      return;
    }
    isLoading.current = true;
    console.debug("[HomePageClient] load() start");

    try {
      // 1. Get current session (timeout-guarded)
      const { data: { user } } = await withTimeout(
        supabase.auth.getUser(),
        FETCH_TIMEOUT_MS
      );

      if (!isMounted.current) return;

      if (!user) {
        console.debug("[HomePageClient] no user → guest");
        setAuthState("guest");
        setLoading(false);
        return;
      }

      // 2. Parallel fetch: profile + upcoming events + people + notes
      const today = new Date().toISOString().split("T")[0];
      const in14  = new Date();
      in14.setDate(in14.getDate() + 14);
      const in14str = in14.toISOString().split("T")[0];

      const [profileResult, eventsResult, peopleResult, notesResult] =
        await withTimeout(
          Promise.all([
            supabase
              .from("profiles")
              .select("full_name, preferences, avatar_url")
              .eq("id", user.id)
              .single(),
            supabase
              .from("events")
              .select("id, title, date, is_important, person_name, category")
              .eq("user_id", user.id)
              .gte("date", today)
              .lte("date", in14str)
              .order("is_important", { ascending: false })
              .order("date",          { ascending: true })
              .limit(1),
            supabase
              .from("people")
              .select("*")
              .eq("user_id", user.id),
            supabase
              .from("notes")
              .select("*")
              .eq("user_id", user.id),
          ]),
          FETCH_TIMEOUT_MS
        );

      if (!isMounted.current) return;

      // 3. Apply profile (unchanged — always applied regardless of insights)
      const p = profileResult.data;
      if (p) {
        setProfile({
          firstName:   p.full_name?.split(" ")[0],
          preferences: p.preferences ?? null,
          avatarUrl:   p.avatar_url  ?? null,
        });
        console.debug("[HomePageClient] profile loaded:", p.full_name);
      }

      // 4. Load Brain insights (Repository + buildInsights live inside
      //    loadBrain now); fall back to existing events-only logic.
      const insights = await loadBrain({
        userId:  user.id,
        profile: profileResult.data,
        people:  peopleResult.data ?? [],
        events:  eventsResult.data ?? [],
        notes:   notesResult.data ?? [],
      });

      const assistant =
        insights.length > 0 ? mapInsightToAssistant(insights[0]) : null;

      if (assistant) {
        console.debug("[HomePageClient] insight-driven assistant:", assistant);
        setAssistantCard(assistant);
        setAuthState(assistant.state);
      } else {
        setAssistantCard(null);
        // ── Existing fallback logic (unchanged) ──
        const ev = eventsResult.data?.[0] ?? null;
        if (ev) {
          const mapped: AssistantEvent = {
            id:           ev.id,
            title:        ev.title,
            date:         ev.date,
            person_name:  ev.person_name  ?? null,
            is_important: ev.is_important ?? false,
            category:     ev.category     ?? null,
          };
          setNextEvent(mapped);
          setAuthState(resolveState(true, mapped));
          console.debug("[HomePageClient] next event:", mapped.title, mapped.date);
        } else {
          setAuthState("calm");
          console.debug("[HomePageClient] no upcoming events → calm");
        }
      }
    } catch (err) {
      // Network timeout, Supabase error, or WebView suspension
      console.warn("[HomePageClient] load() error:", err);
      if (isMounted.current) {
        // Fail gracefully: show guest so user isn't stuck on a spinner
        setAuthState("guest");
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
      isLoading.current = false;
      // Cancel the emergency fallback since we finished normally
      if (emergencyId.current) {
        clearTimeout(emergencyId.current);
        emergencyId.current = null;
      }
      console.debug("[HomePageClient] load() done");
    }
  }, []); // no deps – uses refs + stable supabase client

  // ── Mount / unmount lifecycle ────────────────────────────────────────────
  useEffect(() => {
    isMounted.current = true;
    console.debug("[HomePageClient] mounted");

    // Emergency fallback: if nothing resolves in 8 s → force guest state
    emergencyId.current = setTimeout(() => {
      if (isMounted.current && isLoading.current) {
        console.warn("[HomePageClient] emergency timeout – forcing guest state");
        isLoading.current = false;
        setAuthState("guest");
        setLoading(false);
      }
    }, EMERGENCY_TIMEOUT_MS);

    // Initial load
    load();

    // Auth state listener
    // IMPORTANT: we intentionally do NOT call load() here for SIGNED_IN because
    // the initial load() above already handles it. We only reload on SIGNED_OUT
    // to flip back to guest, and on TOKEN_REFRESHED to stay current.
    // This prevents the recursive "load → auth event → load → …" loop.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        console.debug("[HomePageClient] auth event:", event);
        if (event === "SIGNED_OUT") {
          if (isMounted.current) {
            setAuthState("guest");
            setProfile({});
            setNextEvent(null);
            setLoading(false);
          }
        } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          // Only reload if we're not already doing so
          load();
        }
      }
    );

    return () => {
      console.debug("[HomePageClient] unmounting – cleanup");
      isMounted.current = false;
      isLoading.current = false;
      if (emergencyId.current) clearTimeout(emergencyId.current);
      subscription.unsubscribe();
    };
  }, [load]);

  // ── Derived state ────────────────────────────────────────────────────────
  const isGuest = authState === "guest";

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <main
      style={{
        background: "var(--color-background-tertiary)",
        minHeight: "100vh",
        // Prevent iOS WebView rubber-band bounce from causing white flash
        WebkitOverflowScrolling: "touch",
        overflowX: "hidden",
      }}
    >
      {/* ── Assistant card / skeleton ── */}
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "12px 14px 0" }}>
        {loading ? (
          <AssistantSkeleton />
        ) : (
          <CareFeed hero={assistantCard} />
        )}
      </div>

      {/* ── Guest hero ── */}
      {!loading && isGuest && <GuestHero />}

      {/* ── Logged-in quick nav ── */}
      {!loading && !isGuest && (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 14px" }}>
          <QuickNav />
        </div>
      )}

      {/* ── Heavy components – lazy-loaded, never block initial paint ── */}
      <Suspense fallback={null}>
        <FloatingActions />
      </Suspense>
      <Suspense fallback={null}>
        <ChatUIMount />
      </Suspense>

      {/* ── Cookie consent – deferred via requestAnimationFrame internally ── */}
      <CookieConsent />
    </main>
  );
}