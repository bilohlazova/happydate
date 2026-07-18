"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useLocale, useTranslations } from "next-intl";

type Review = {
  id: string;
  created_at: string;
  name: string;
  message: string;
};

const PAGE_SIZE = 6;

export default function ReviewsClient() {
  const t = useTranslations("static.reviews");
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // ===== LOAD LIST =====
  const loadReviews = async (reset = false) => {
    setLoadingList(true);
    const currentPage = reset ? 0 : page;
    const from = currentPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("reviews")
      .select("id, created_at, name, message")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error(error);
    } else {
      const safeData = data ?? [];
      const newList = reset ? safeData : [...reviews, ...safeData];
      setReviews(newList);
      setHasMore(safeData.length === PAGE_SIZE);
      setPage(reset ? 1 : currentPage + 1);
    }
    setLoadingList(false);
  };

  useEffect(() => {
    // перше завантаження опублікованих відгуків
    loadReviews(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== SUBMIT =====
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // зберігаємо форму ДО await, щоб уникнути "Cannot read properties of null (reading 'reset')"
    const formEl = e.currentTarget as HTMLFormElement;

    const fd = new FormData(formEl);
    const name = (fd.get("name") as string)?.trim();
    const email = (fd.get("email") as string)?.trim();
    const message = (fd.get("message") as string)?.trim();

    try {
      const { error } = await supabase.from("reviews").insert({
        name,
        email,
        message,
        source: "reviews_page",
      });
      if (error) throw error;

      formEl.reset();
      alert(t("success"));
      setIsOpen(false);
      // опційно: loadReviews(true) після публікації адміном
    } catch (err: unknown) {
      console.error("[Reviews] submit failed", err);
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-pink-100 via-amber-50 to-sky-100 dark:from-slate-800 dark:via-slate-700 dark:to-slate-900">
      {/* Dekoracje */}
      <div className="absolute top-[-20%] left-[-10%] h-[300px] w-[300px] rounded-full bg-pink-300/30 blur-3xl" />
      <div className="absolute bottom-[-20%] right-[-10%] h-[300px] w-[300px] rounded-full bg-sky-300/30 blur-3xl" />

      {/* HERO */}
      <section className="relative z-10 text-center py-20 md:py-28">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white drop-shadow-sm">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-slate-700 dark:text-slate-300 md:text-lg">
          {t("subtitle")}
        </p>
      </section>

      {/* LISTA OPINII */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        {reviews.length === 0 && !loadingList ? (
          <div className="rounded-3xl border border-dashed border-slate-300/50 dark:border-slate-600/50 bg-white/70 dark:bg-slate-800/70 p-12 text-center shadow-xl backdrop-blur">
            <p className="text-lg text-slate-600 dark:text-slate-300">
              {t("empty")}
            </p>
            <div className="mt-10">
              <button
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500 px-8 py-4 font-semibold text-white shadow-lg hover:from-fuchsia-600 hover:to-pink-600 transition-all duration-200"
              >
                {t("wantLeave")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {reviews.map((r) => (
                <figure
                  key={r.id}
                  className="relative rounded-2xl bg-white/90 dark:bg-slate-800/80 backdrop-blur p-6 shadow-sm ring-1 ring-black/5"
                >
                  <blockquote className="text-slate-800 dark:text-slate-100">
                    “{r.message}”
                  </blockquote>
                  <figcaption className="mt-4 flex items-center justify-between text-sm text-slate-500">
                    <span>— {r.name}</span>
                    <time dateTime={r.created_at}>
                      {new Date(r.created_at).toLocaleDateString(locale)}
                    </time>
                  </figcaption>
                  <span className="pointer-events-none absolute -bottom-3 left-8 h-6 w-6 rotate-45 rounded-[6px] bg-white/90 dark:bg-slate-800/80 shadow-sm ring-1 ring-black/5" />
                </figure>
              ))}
            </div>

            <div className="mt-10 flex items-center justify-center gap-4">
              <button
                onClick={() => setIsOpen(true)}
                className="rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500 px-6 py-3 font-semibold text-white shadow hover:from-fuchsia-600 hover:to-pink-600"
              >
                {t("leave")}
              </button>
              {hasMore && (
                <button
                  onClick={() => loadReviews(false)}
                  disabled={loadingList}
                  className="rounded-full border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                >
                  {loadingList ? t("loading") : t("loadMore")}
                </button>
              )}
            </div>
          </>
        )}
      </section>

      {/* MODAL — форма додавання */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl dark:bg-slate-800">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 dark:hover:text-white"
              aria-label={t("close")}
            >
              ✕
            </button>

            <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">
              {t("modalTitle")}
            </h2>
            <p className="mb-4 text-sm text-slate-500">{t("moderation")}</p>

            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <form className="space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("name")}
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  placeholder={t("namePlaceholder")}
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("email")}
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  placeholder={t("emailPlaceholder")}
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("message")}
                </label>
                <textarea
                  name="message"
                  rows={4}
                  required
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  placeholder={t("messagePlaceholder")}
                  disabled={loading}
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-4 w-full rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500 px-6 py-3 font-semibold text-white shadow hover:from-fuchsia-600 hover:to-pink-600 disabled:opacity-60"
              >
                {loading ? t("sending") : t("send")}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
