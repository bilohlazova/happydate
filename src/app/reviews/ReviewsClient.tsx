"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useLocale, useTranslations } from "next-intl";
import { logOperationalError } from "@/lib/observability/safeLogger";

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
  const [listError, setListError] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // ===== LOAD LIST =====
  const loadReviews = async (reset = false) => {
    setLoadingList(true);
    setListError(false);
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
      logOperationalError("reviews", "load-failed", error);
      setListError(true);
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      logOperationalError("reviews", "submit-failed", err);
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="reviews-soul">
      <section className="reviews-soul__hero">
        <p className="reviews-soul__eyebrow">{t("eyebrow")}</p>
        <h1>{t("title")}</h1>
        <p>{t("subtitle")}</p>
        <div className="reviews-soul__promise">
          <span aria-hidden="true">✦</span>
          <div>
            <strong>{t("promiseTitle")}</strong>
            <p>{t("promiseText")}</p>
          </div>
        </div>
      </section>

      <section className="reviews-soul__content" aria-busy={loadingList}>
        {listError && (
          <div className="reviews-soul__error" role="alert">
            <p>{t("listError")}</p>
            <button type="button" onClick={() => void loadReviews(true)}>{t("retry")}</button>
          </div>
        )}
        {loadingList && reviews.length === 0 && (
          <div className="reviews-soul__loading" role="status">
            <span className="reviews-soul__spinner" aria-hidden="true" />
            {t("loading")}
          </div>
        )}
        {reviews.length === 0 && !loadingList && !listError ? (
          <div className="reviews-soul__empty">
            <span aria-hidden="true">💬</span>
            <h2>{t("emptyTitle")}</h2>
            <p>{t("empty")}</p>
            <button type="button" onClick={() => setIsOpen(true)}>{t("wantLeave")}</button>
          </div>
        ) : reviews.length > 0 ? (
          <>
            <div className="reviews-soul__grid">
              {reviews.map((r) => (
                <figure key={r.id} className="reviews-soul__card">
                  <span className="reviews-soul__quote" aria-hidden="true">“</span>
                  <blockquote>{r.message}</blockquote>
                  <figcaption>
                    <span>— {r.name}</span>
                    <time dateTime={r.created_at}>
                      {new Date(r.created_at).toLocaleDateString(locale)}
                    </time>
                  </figcaption>
                </figure>
              ))}
            </div>

            <div className="reviews-soul__actions">
              <button type="button" onClick={() => setIsOpen(true)} className="reviews-soul__primary">
                {t("leave")}
              </button>
              {hasMore && (
                <button
                  type="button"
                  onClick={() => loadReviews(false)}
                  disabled={loadingList}
                  className="reviews-soul__more"
                >
                  {loadingList ? t("loading") : t("loadMore")}
                </button>
              )}
            </div>
          </>
        ) : null}
      </section>

      {/* MODAL — форма додавання */}
      {isOpen && (
        <div className="reviews-soul__backdrop">
          <div className="reviews-soul__modal" role="dialog" aria-modal="true" aria-labelledby="review-dialog-title" aria-describedby="review-dialog-description">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="reviews-soul__close"
              aria-label={t("close")}
            >
              ✕
            </button>

            <p className="reviews-soul__eyebrow">{t("dialogEyebrow")}</p>
            <h2 id="review-dialog-title">
              {t("modalTitle")}
            </h2>
            <p id="review-dialog-description" className="reviews-soul__moderation">{t("moderation")}</p>

            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <form className="reviews-soul__form" onSubmit={onSubmit}>
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
                <p className="reviews-soul__field-note">{t("messageHelp")}</p>
              </div>

              <p className="reviews-soul__privacy">🔒 {t("emailPrivacy")}</p>

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
