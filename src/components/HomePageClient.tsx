"use client";

// src/components/HomePageClient.tsx
// Цей компонент замінює логіку в page.tsx
// Перевіряє чи юзер залогінений і показує потрібний контент

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AIAssistant, { HappyEvent } from "@/components/AIAssistant";
import FloatingActions from "@/components/FloatingActions";
import ChatUIMount from "@/components/ChatUIMount";

interface Opinion {
  text: string;
  author: string;
}

interface Props {
  opinions: Opinion[];
}

export default function HomePageClient({ opinions }: Props) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null); // null = loading
  const [firstName, setFirstName] = useState("Użytkowniku");
  const [events, setEvents] = useState<HappyEvent[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        setIsLoggedIn(false);
        return;
      }

      setIsLoggedIn(true);

      // Отримуємо ім'я
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (!cancelled && profile?.full_name) {
        setFirstName(profile.full_name.split(" ")[0]);
      }

      // Отримуємо події на 14 днів
      const today = new Date().toISOString().split("T")[0];
      const in14 = new Date();
      in14.setDate(in14.getDate() + 14);
      const in14str = in14.toISOString().split("T")[0];

      const { data: eventsData } = await supabase
        .from("events")
        .select("id, title, date, is_important, person_name")
        .eq("user_id", user.id)
        .gte("date", today)
        .lte("date", in14str)
        .order("is_important", { ascending: false })
        .order("date", { ascending: true });

      if (!cancelled) {
        setEvents(
          (eventsData ?? []).map((e) => ({
            id: e.id,
            title: e.title,
            date: e.date,
            is_important: e.is_important ?? false,
            person_name: e.person_name ?? null,
            relation: null,
          }))
        );
      }
    }

    load();

    // Слухаємо зміни авторизації
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      cancelled = true;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  return (
    <main className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">

      {/* ── СТАН ЗАВАНТАЖЕННЯ ── */}
      {isLoggedIn === null && (
        <div className="max-w-xl mx-auto px-4 pt-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-100" />
              <div className="flex-1">
                <div className="h-4 bg-gray-100 rounded w-32 mb-2" />
                <div className="h-6 bg-gray-100 rounded w-48 mb-1" />
                <div className="h-3 bg-gray-100 rounded w-40" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ЗАЛОГІНЕНИЙ: АСИСТЕНТ ── */}
      {isLoggedIn === true && (
        <div className="max-w-xl mx-auto px-4 pt-4">
          <AIAssistant
            userName={firstName}
            events={events}
          />
        </div>
      )}

      {/* ── ГІСТЬ: HERO ── */}
      {isLoggedIn === false && (
        <section className="bg-gradient-to-r from-pink-100 via-yellow-100 to-blue-100 py-16 sm:py-20 px-4 text-center relative overflow-hidden">
          <div className="max-w-4xl mx-auto relative z-10">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
              HappyDate — spokój, że o ważnych chwilach ktoś pamięta za Ciebie 💛
            </h1>
            <p className="text-lg md:text-xl text-gray-700 mb-8">
              Zapisuj ważnych ludzi, ich daty i drobne detale.
              My przypomnimy w odpowiednim momencie i pomożemy wybrać właściwe słowa.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/auth/login"
                className="px-6 py-3 bg-pink-500 text-white rounded-xl text-lg font-semibold shadow-md hover:bg-pink-600 transition"
              >
                Zacznij za darmo
              </Link>
              <Link
                href="/services"
                className="px-6 py-3 bg-yellow-400 text-gray-900 rounded-xl text-lg font-semibold shadow-md hover:bg-yellow-500 transition flex items-center justify-center gap-2"
              >
                💛 Zobacz Care
              </Link>
            </div>
          </div>
          <div className="absolute text-pink-400 text-3xl top-6 left-6 animate-pulse">💖</div>
          <div className="absolute text-yellow-400 text-2xl top-24 right-10 animate-ping">✨</div>
        </section>
      )}

      {/* ── РЕШТА СТОРІНКИ (завжди видима) ── */}

      {/* Jak to działa */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-2xl font-semibold mb-10">Jak działa HappyDate Care?</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            <div>
              <span className="block text-3xl font-extrabold text-blue-400 mb-2">1</span>
              <p>Dodajesz ważną osobę i jej daty</p>
            </div>
            <div>
              <span className="block text-3xl font-extrabold text-pink-400 mb-2">2</span>
              <p>Zapisujesz drobne notatki i preferencje</p>
            </div>
            <div>
              <span className="block text-3xl font-extrabold text-yellow-400 mb-2">3</span>
              <p>My przypominamy i pomagamy podjąć decyzję</p>
            </div>
          </div>
        </div>
      </section>

      {/* Dlaczego */}
      <section className="py-20 bg-gray-100 dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-semibold text-center mb-12">
            Dlaczego ludzie wybierają HappyDate?
          </h2>
          <div className="space-y-8">
            <div>
              <h3 className="font-bold text-xl mb-1">🤖 Inteligentna pamięć</h3>
              <p className="text-gray-700 dark:text-gray-300">
                HappyDate zapamiętuje to, czego nie chcesz trzymać w głowie.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-xl mb-1">🧠 Mniej stresu</h3>
              <p className="text-gray-700 dark:text-gray-300">
                Koniec z zapomniałem, nie zdążyłem, nie wiedziałem co napisać.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-xl mb-1">❤️ Emocje, nie rzeczy</h3>
              <p className="text-gray-700 dark:text-gray-300">
                Skupiamy się na relacjach, słowach i obecności — nie na przedmiotach.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Care promo */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-lg mx-auto bg-gradient-to-r from-violet-600 to-pink-500 rounded-3xl p-6 text-white text-center shadow-xl">
          <div className="text-3xl mb-3">💛</div>
          <h2 className="text-xl font-extrabold mb-2">HappyDate Care</h2>
          <p className="text-sm opacity-90 mb-5 leading-relaxed">
            Subskrypcja, która przejmuje pamiętanie i delikatne przypominanie — za Ciebie. Od 29 zł/mies.
          </p>
          <Link
            href="/services"
            className="inline-block bg-white text-violet-700 font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition"
          >
            Dowiedz się więcej →
          </Link>
        </div>
      </section>

      {/* Opinie */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-semibold mb-10">Co mówią użytkownicy 💬</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {opinions.map((o) => (
              <div key={o.author} className="bg-gray-100 dark:bg-gray-800 p-6 rounded-xl">
                {o.text}
                <p className="text-sm mt-3 text-gray-500">— {o.author}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FloatingActions />
      <ChatUIMount />
      <CookieConsent />
    </main>
  );
}

// ── COOKIE CONSENT ──
function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("happydate_cookie_consent")) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 bg-gray-800 text-white py-4 px-6 z-50">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-sm">
          Używamy cookies zgodnie z{" "}
          <Link href="/privacy" className="underline">Polityką Prywatności</Link>.
        </p>
        <button
          onClick={() => {
            localStorage.setItem("happydate_cookie_consent", "true");
            setVisible(false);
          }}
          className="bg-blue-500 px-4 py-2 rounded-md font-semibold hover:bg-blue-600"
        >
          Akceptuję
        </button>
      </div>
    </div>
  );
}