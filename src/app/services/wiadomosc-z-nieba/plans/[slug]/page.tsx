import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBySlug, plans } from "../data";

type Props = { params: { slug: string } };

export async function generateStaticParams() {
  return plans.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const plan = getBySlug(params.slug);
  if (!plan) return {};
  const title = `HappyDate – ${plan.name}`;
  const description = plan.short;
  return {
    title,
    description,
    alternates: {
      canonical: `/services/wiadomosc-z-nieba/plans/${plan.slug}`,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/services/wiadomosc-z-nieba/plans/${plan.slug}`,
    },
    twitter: { card: "summary_large_image" },
  };
}

export default function PlanPage({ params }: Props) {
  const plan = getBySlug(params.slug);
  if (!plan) return notFound();

  return (
    <main className="relative overflow-hidden">
      {/* jasne pastelowe tło jak na pozostałych stronach */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#f8fbff] via-[#f6f2ff] to-[#fff7fb]" />

      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          {/* breadcrumbs */}
          <nav className="mb-6 text-sm text-slate-500">
            <Link href="/services/wiadomosc-z-nieba" className="hover:underline">
              Wiadomość z Nieba
            </Link>{" "}
            / <span className="text-slate-700">{plan.name}</span>
          </nav>

          {/* header */}
          <div className="rounded-3xl border border-white/70 bg-white/70 p-8 text-center shadow-[0_16px_50px_-20px_rgba(0,0,0,.15)] backdrop-blur-lg">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">
              {plan.name}
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-slate-700">{plan.long}</p>

            <div className="mt-5 inline-flex items-baseline gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-500 px-4 py-1 text-white shadow">
              <span className="text-2xl font-extrabold">{plan.price}</span>
            </div>

            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={`/services/wiadomosc-z-nieba/order?plan=${plan.type}`}
                className="rounded-2xl bg-gradient-to-r from-fuchsia-500 to-pink-500 px-6 py-3 font-semibold text-white shadow-lg hover:brightness-110"
              >
                Zamów ten plan
              </Link>
              <Link
                href="/services/wiadomosc-z-nieba#pricing"
                className="rounded-2xl bg-white px-6 py-3 font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              >
                Wróć do porównania
              </Link>
            </div>
          </div>

          {/* sekcje cech */}
          <div className="mt-10 grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-white/70 bg-white/70 p-6 shadow-[0_12px_40px_-20px_rgba(0,0,0,.12)] backdrop-blur-lg">
              <h2 className="text-xl font-semibold text-slate-900">Co zyskujesz</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-white/70 bg-white/70 p-6 shadow-[0_12px_40px_-20px_rgba(0,0,0,.12)] backdrop-blur-lg">
              <h2 className="text-xl font-semibold text-slate-900">W zestawie</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
                {(plan.includes ?? ["Panel klienta", "Wsparcie e-mail"]).map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-white/70 bg-white/70 p-6 shadow-[0_12px_40px_-20px_rgba(0,0,0,.12)] backdrop-blur-lg md:col-span-2">
              <h2 className="text-xl font-semibold text-slate-900">Jak to działa</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-slate-700">
                {(plan.delivery ?? [
                  "Wybierasz datę i odbiorcę",
                  "Dodajesz treść lub wideo",
                  "My dostarczamy dokładnie w wybranym dniu",
                ]).map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ol>

              <div className="mt-6 text-center">
                <Link
                  href={`/services/wiadomosc-z-nieba/order?plan=${plan.type}`}
                  className="inline-flex rounded-2xl bg-gradient-to-r from-fuchsia-500 to-pink-500 px-6 py-3 font-semibold text-white shadow-lg hover:brightness-110"
                >
                  Przejdź do zamówienia
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
