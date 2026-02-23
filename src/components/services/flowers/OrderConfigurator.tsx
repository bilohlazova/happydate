"use client";

import Link from "next/link";
import { useState } from "react";

type SizeKey = "mini" | "standard" | "premium";

const BASE_PRICES: Record<SizeKey, number> = {
  mini: 99,
  standard: 149,
  premium: 199,
};

const ADDONS = [
  { key: "anon", label: "Anonimowa dostawa", price: 0 },
  { key: "qr", label: "Kartka QR (audio/wideo)", price: 19 },
  { key: "choco", label: "Czekoladki", price: 29 },
  { key: "balloon", label: "Balon", price: 19 },
] as const;

const fmt = (v: number) => `${v.toFixed(0)} zł`;

export default function OrderConfigurator() {
  const [size, setSize] = useState<SizeKey>("standard");
  const [addons, setAddons] = useState<Record<string, boolean>>({});

  const base = BASE_PRICES[size];
  const extras = ADDONS.filter(a => addons[a.key]).reduce((s, a) => s + a.price, 0);
  const total = base + extras;

  const toggle = (k: string) => setAddons(prev => ({ ...prev, [k]: !prev[k] }));

  const SIZE_CARDS: { key: SizeKey; emoji: string; title: string; desc: string }[] = [
    { key: "mini", emoji: "🌷", title: "Mini", desc: "Świeże kwiaty + liścik." },
    { key: "standard", emoji: "💐", title: "Standard", desc: "Większy wybór, efektowna kompozycja." },
    { key: "premium", emoji: "🌺", title: "Premium", desc: "Efekt „wow”: bogatszy bukiet + opakowanie." },
  ];

  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      {/* wybór rozmiaru */}
      <div className="grid gap-4 sm:grid-cols-3">
        {SIZE_CARDS.map(card => (
          <button
            key={card.key}
            onClick={() => setSize(card.key)}
            className={`rounded-2xl border p-5 text-left transition ${
              size === card.key ? "border-pink-500 bg-pink-50"
                                : "border-slate-200 bg-white hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{card.emoji}</span>
              <h3 className="font-semibold">{card.title}</h3>
            </div>
            <p className="mt-1 text-sm text-slate-600">{card.desc}</p>
            <p className="mt-3 font-bold">{fmt(BASE_PRICES[card.key])}</p>
          </button>
        ))}
      </div>

      {/* dodatki */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
        <h4 className="font-semibold">Dodatki</h4>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {ADDONS.map(a => (
            <label key={a.key} className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
              <div className="flex items-center gap-2">
                <input type="checkbox" className="size-4" checked={!!addons[a.key]} onChange={() => toggle(a.key)} />
                <span>{a.label}</span>
              </div>
              <span className="text-sm font-semibold text-amber-700">
                {a.price === 0 ? "gratis" : `+${fmt(a.price)}`}
              </span>
            </label>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <span className="text-slate-600">Suma</span>
          <span className="text-2xl font-extrabold">{fmt(total)}</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/survey" className="rounded-xl bg-pink-500 px-4 py-2 font-semibold text-white hover:bg-pink-600">
            Zamów przez formularz
          </Link>
          <Link href="/services/asystent-ai" className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-800 hover:bg-slate-50">
            Poproś Asystenta AI o pomoc
          </Link>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Finalną kompozycję dobierze florysta wg świeżości sezonowych kwiatów. Preferencje możesz dodać w formularzu zamówienia.
        </p>
      </div>
    </section>
  );
}
