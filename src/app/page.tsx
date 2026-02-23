"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import FloatingActions from "@/components/FloatingActions";
import ChatUIMount from "@/components/ChatUIMount";

export default function HomePage() {
  useEffect(() => {
    const el = document.getElementById("wowBlock");
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            el.classList.remove("translate-y-10", "opacity-0");
            el.classList.add("translate-y-0", "opacity-100");
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <main className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* HERO */}
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
              href="/dashboard"
              className="px-6 py-3 bg-pink-500 text-white rounded-xl text-lg font-semibold shadow-md hover:bg-pink-600 transition focus:ring-2 focus:ring-pink-400"
            >
              Zacznij korzystać
            </Link>

            <Link
              href="/pricing"
              className="px-6 py-3 bg-yellow-400 text-gray-900 rounded-xl text-lg font-semibold shadow-md hover:bg-yellow-500 transition focus:ring-2 focus:ring-yellow-300"
            >
              Zobacz jak to działa
            </Link>
          </div>
        </div>

        <div className="absolute text-pink-400 text-3xl top-6 left-6 animate-pulse">💖</div>
        <div className="absolute text-yellow-400 text-2xl top-24 right-10 animate-ping">✨</div>
      </section>

      {/* Jak to działa */}
      <section
        id="wowBlock"
        className="transition-all duration-700 ease-in-out translate-y-10 opacity-0 py-16"
      >
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
              <h3 className="font-bold text-xl mb-1 flex gap-2 items-center">
                🤖 Inteligentna pamięć
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                HappyDate zapamiętuje to, czego nie chcesz trzymać w głowie.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-xl mb-1 flex gap-2 items-center">
                🧠 Mniej stresu
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                Koniec z „zapomniałem”, „nie zdążyłem”, „nie wiedziałem co napisać”.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-xl mb-1 flex gap-2 items-center">
                ❤️ Emocje, nie rzeczy
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                Skupiamy się na relacjach, słowach i obecności — nie na przedmiotach.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Opinie */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-semibold mb-10">
            Co mówią użytkownicy 💬
          </h2>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-xl">
              „Pierwszy raz miałem wrażenie, że ktoś naprawdę ogarnia za mnie ważne sprawy.”
              <p className="text-sm mt-3 text-gray-500">— Adam</p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-xl">
              „Nie zapomniałam o niczym w tym roku. To ogromna ulga.”
              <p className="text-sm mt-3 text-gray-500">— Kasia</p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-xl">
              „To nie jest aplikacja. To spokój w głowie.”
              <p className="text-sm mt-3 text-gray-500">— Ola</p>
            </div>
          </div>
        </div>
      </section>

      <FloatingActions />
      <ChatUIMount />
      <CookieConsent />
    </main>
  );
}

function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("happydate_cookie_consent")) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 bg-gray-800 bg-opacity-90 text-white py-4 px-6 z-50">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-sm">
          Używamy cookies zgodnie z{" "}
          <Link href="/privacy" className="underline">
            Polityką Prywatności
          </Link>
          .
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
