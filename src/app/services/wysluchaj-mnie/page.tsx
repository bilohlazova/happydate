// src/app/services/wysluchaj-mnie/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "HappyDate – Wysłuchaj mnie",
  description:
    "Potrzebujesz rozmowy z kimś, kto naprawdę słucha? Usługa „Wysłuchaj mnie” to bezpieczna przestrzeń pełna empatii, zrozumienia i ciepła.",
  alternates: { canonical: "/services/wysluchaj-mnie" },
  openGraph: {
    title: "HappyDate – Wysłuchaj mnie",
    description:
      "Porozmawiaj z kimś, kto naprawdę słucha. Empatia, wsparcie i zrozumienie bez oceniania.",
    type: "website",
    url: "https://happydate.pl/services/wysluchaj-mnie",
  },
  twitter: { card: "summary_large_image" },
};

export default function WysluchajMniePage() {
  return (
    <main className="overflow-x-hidden">
      {/* HERO */}
      <section className="relative isolate py-24 text-center">
        {/* tło hero w tej samej palecie co reszta strony */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-br from-sky-100 via-blue-50 to-emerald-50"
        />
        {/* delikatny radial dla głębi */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(70%_60%_at_50%_40%,#000_40%,transparent_100%)]"
          style={{
            background:
              "radial-gradient(60rem 25rem at 50% 20%, rgba(56,189,248,.25), transparent 60%), radial-gradient(40rem 30rem at 80% 80%, rgba(16,185,129,.18), transparent 60%)",
          }}
        />
        <div className="container mx-auto max-w-3xl px-4">
          <h1 className="text-4xl font-extrabold text-neutral-900 md:text-5xl">
            💬 Wysłuchaj mnie
          </h1>
          <p className="mt-4 text-lg text-neutral-700 md:text-xl">
            Czasem wystarczy, że ktoś po prostu wysłucha. Bez rad, bez ocen.
            <br />Z empatią, ciepłem i spokojem.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/survey?flow=listener"
              className="inline-flex items-center rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 px-6 py-3 font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              Umów rozmowę 💬
            </Link>
            <Link
              href="#gift"
              className="inline-flex items-center rounded-2xl bg-white/80 backdrop-blur px-6 py-3 font-semibold text-sky-700 ring-1 ring-sky-200 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              Kup jako prezent 🎁
            </Link>
          </div>
        </div>
      </section>

      {/* O CO CHODZI */}
      <section className="py-20 bg-white">
        <div className="container mx-auto max-w-4xl px-4 grid md:grid-cols-2 gap-10 items-center">
          {/* obraz w „aurze”, by zlał się z paletą strony */}
          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-3 rounded-[28px] bg-gradient-to-br from-sky-200/70 via-blue-100/60 to-emerald-100/70 blur-xl"
            />
            <figure className="relative overflow-hidden rounded-[28px] bg-white shadow-xl ring-1 ring-black/5">
              <Image
                src="/images/wysluchaj1.png" // zapewnij plik: public/images/wysluchaj.png
                alt="Empatyczna rozmowa HappyDate"
                width={1200}
                height={800}
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className="h-auto w-full object-cover"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent"
              />
             
            </figure>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-3 text-neutral-900">
              Rozmowa, która leczy ciszę
            </h2>
            <p className="text-neutral-700 leading-relaxed">
              W ramach usługi „Wysłuchaj mnie” możesz anonimowo porozmawiać z
              empatyczną osobą z zespołu HappyDate lub jednym z naszych
              słuchaczy–wolontariuszy. To nie terapia, ale przestrzeń, gdzie
              możesz po prostu być sobą.
            </p>
            <ul className="mt-5 space-y-2 text-neutral-700">
              <li>🌙 Bez o ceniania, presji i pośpiechu</li>
              <li>☕ Rozmowa audio lub chat — jak wolisz</li>
              <li>💌 Możliwość wiadomości anonimowej</li>
              <li>🤍 100% poufności i empatii</li>
            </ul>
          </div>
        </div>
      </section>

      {/* JAK TO DZIAŁA */}
      <section className="py-20">
        <div className="container mx-auto max-w-5xl px-4 text-center">
          <div className="mx-auto mb-10 max-w-xl">
            <h2 className="text-3xl font-extrabold text-neutral-900">
              Jak to działa?
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3 text-left">
            {[
              {
                emoji: "📝",
                title: "Opisz, czego potrzebujesz",
                desc: "Wypełnij krótki formularz – możesz pozostać anonimowy.",
              },
              {
                emoji: "🤝",
                title: "Dopasujemy słuchacza",
                desc: "Wybierz formę kontaktu – rozmowa głosowa, wideo lub chat.",
              },
              {
                emoji: "💬",
                title: "Po prostu porozmawiaj",
                desc: "Czasem wystarczy jedna rozmowa, by poczuć się lżej.",
              },
            ].map((s) => (
              <div
                key={s.title}
                className="rounded-2xl bg-white/80 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur"
              >
                <div className="text-3xl mb-3">{s.emoji}</div>
                <h3 className="font-semibold text-lg mb-2 text-neutral-900">
                  {s.title}
                </h3>
                <p className="text-neutral-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CENNIK / VOUCHERY */}
      <section className="py-20 bg-white" id="cennik">
        <div className="container mx-auto max-w-5xl px-4">
          <h2 className="text-3xl font-extrabold text-neutral-900 text-center mb-10">
            Cennik i vouchery
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            {/* 30 min */}
            <div className="rounded-3xl border border-sky-100 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-neutral-900">
                  30 minut
                </h3>
                <span className="rounded-full bg-sky-50 text-sky-700 text-xs px-3 py-1 border border-sky-200">
                  Lekka rozmowa
                </span>
              </div>
              <p className="mt-2 text-neutral-600">
                Idealne, gdy chcesz wyrzucić z siebie myśli i poczuć ulgę.
              </p>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-neutral-900">
                  79 zł
                </span>
                <span className="text-neutral-400 text-sm">brutto</span>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/survey?flow=listener&plan=30"
                  className="inline-flex items-center rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 px-5 py-2.5 font-semibold text-white shadow-lg hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Umów rozmowę
                </Link>
                <Link
                  href="/checkout/listener-voucher?duration=30"
                  className="inline-flex items-center rounded-2xl bg-white px-5 py-2.5 font-semibold text-sky-700 ring-1 ring-sky-200 shadow-sm hover:bg-sky-50"
                >
                  Kup voucher 🎁
                </Link>
              </div>
              <ul className="mt-4 text-sm text-neutral-600 space-y-1">
                <li>• Rozmowa audio lub chat</li>
                <li>• Termin w 24–48h (zazwyczaj szybciej)</li>
                <li>• Voucher ważny 6 miesięcy</li>
              </ul>
            </div>

            {/* 60 min */}
            <div className="rounded-3xl border border-emerald-100 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-neutral-900">
                  60 minut
                </h3>
                <span className="rounded-full bg-emerald-50 text-emerald-700 text-xs px-3 py-1 border border-emerald-200">
                  Głębiej i spokojniej
                </span>
              </div>
              <p className="mt-2 text-neutral-600">
                Kiedy potrzebujesz więcej czasu, by uporządkować emocje.
              </p>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-neutral-900">
                  129 zł
                </span>
                <span className="text-neutral-400 text-sm">brutto</span>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/survey?flow=listener&plan=60"
                  className="inline-flex items-center rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 font-semibold text-white shadow-lg hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Umów rozmowę
                </Link>
                <Link
                  href="/checkout/listener-voucher?duration=60"
                  className="inline-flex items-center rounded-2xl bg-white px-5 py-2.5 font-semibold text-emerald-700 ring-1 ring-emerald-200 shadow-sm hover:bg-emerald-50"
                >
                  Kup voucher 🎁
                </Link>
              </div>
              <ul className="mt-4 text-sm text-neutral-600 space-y-1">
                <li>• Rozmowa audio lub chat</li>
                <li>• Priorytetowe terminy</li>
                <li>• Voucher ważny 6 miesięcy</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* KUP JAKO PREZENT */}
      <section
        className="py-20 bg-gradient-to-br from-sky-50 via-blue-50 to-emerald-50"
        id="gift"
      >
        <div className="container mx-auto max-w-4xl px-4">
          <h2 className="text-3xl font-extrabold text-neutral-900 text-center mb-3">
            Kup jako prezent 🎁
          </h2>
          <p className="text-center text-neutral-700 max-w-2xl mx-auto">
            Podaruj komuś uważność i spokój. Wyślemy piękny voucher PDF z Twoją
            dedykacją (e-mail) albo przygotujemy wersję do wydruku. Możesz
            pozostać anonimowy/a.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              {
                emoji: "🖨️",
                h: "PDF do druku",
                p: "Elegancki szablon A4 z kodem vouchera.",
              },
              {
                emoji: "✉️",
                h: "E-mail z dedykacją",
                p: "Wyślemy w wybranym dniu i godzinie.",
              },
              {
                emoji: "🕊️",
                h: "Anonimowość",
                p: "Jeśli chcesz — przekażemy prezent dyskretnie.",
              },
            ].map((b) => (
              <div
                key={b.h}
                className="rounded-2xl bg-white/80 p-5 shadow-sm ring-1 ring-black/5 backdrop-blur"
              >
                <div className="text-2xl">{b.emoji}</div>
                <h3 className="mt-2 font-semibold text-neutral-900">{b.h}</h3>
                <p className="text-neutral-600 text-sm">{b.p}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/checkout/listener-voucher?duration=30"
              className="inline-flex items-center rounded-2xl bg-white px-5 py-2.5 font-semibold text-sky-700 ring-1 ring-sky-200 shadow-sm hover:bg-sky-50"
            >
              Voucher 30 min
            </Link>
            <Link
              href="/checkout/listener-voucher?duration=60"
              className="inline-flex items-center rounded-2xl bg-white px-5 py-2.5 font-semibold text-emerald-700 ring-1 ring-emerald-200 shadow-sm hover:bg-emerald-50"
            >
              Voucher 60 min
            </Link>
            <Link
              href="/survey?flow=listener&gift=1"
              className="inline-flex items-center rounded-2xl bg-gradient-to-r from-pink-500 to-orange-500 px-6 py-3 font-semibold text-white shadow-lg hover:-translate-y-0.5 hover:shadow-xl"
            >
              Dołącz dedykację 💌
            </Link>
          </div>

          <p className="mt-4 text-center text-xs text-neutral-500">
            Voucher ważny 6 miesięcy. Po zakupie otrzymasz kod i instrukcję
            rezerwacji terminu.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-white">
        <div className="container mx-auto max-w-4xl px-4">
          <h2 className="text-2xl font-extrabold text-neutral-900 mb-6">
            FAQ
          </h2>
          <div className="space-y-4">
            <details className="rounded-2xl border p-4">
              <summary className="cursor-pointer font-semibold">
                Czy to terapia?
              </summary>
              <p className="mt-2 text-neutral-700">
                Nie. To empatyczna rozmowa i uważne wysłuchanie. W sytuacjach
                kryzysowych rekomendujemy kontakt ze specjalistą lub numerem
                alarmowym.
              </p>
            </details>
            <details className="rounded-2xl border p-4">
              <summary className="cursor-pointer font-semibold">
                Czy rozmowa jest anonimowa?
              </summary>
              <p className="mt-2 text-neutral-700">
                Tak, możesz pozostać anonimowy/a. Traktujemy poufność bardzo
                poważnie.
              </p>
            </details>
            <details className="rounded-2xl border p-4">
              <summary className="cursor-pointer font-semibold">
                Jak zrealizować voucher?
              </summary>
              <p className="mt-2 text-neutral-700">
                Wejdź na tę stronę, kliknij „Umów rozmowę” i w formularzu wpisz
                kod vouchera. Zespół potwierdzi termin e-mailem.
              </p>
            </details>
          </div>
        </div>
      </section>

    
    </main>
  );
}
