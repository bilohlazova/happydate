"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { changeApplicationLocale } from "@/i18n/changeApplicationLocale";
import { isSupportedLocale, type AppLocale } from "@/i18n/config";
import { setLocaleCookie } from "@/i18n/localeCookie";
import { getLanguageOption, LANGUAGE_OPTIONS } from "@/i18n/localeOptions";
import { updateCurrentUserPreferredLocale } from "@/lib/repositories/profile/profileLocale.repository";

type LanguageSwitcherProps = {
  isAuthenticated: boolean;
  variant?: "header" | "profile";
};

export default function LanguageSwitcher({
  isAuthenticated,
  variant = "header",
}: LanguageSwitcherProps) {
  const localeValue = useLocale();
  const locale: AppLocale = isSupportedLocale(localeValue) ? localeValue : "pl";
  const translate = useTranslations("common.language");
  const profileTranslate = useTranslations("profile.settings.language");
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pendingLocale, setPendingLocale] = useState<AppLocale | null>(null);
  const [syncFailed, setSyncFailed] = useState(false);
  const activeOption = getLanguageOption(locale);

  const closeAndFocus = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAndFocus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const selectLocale = async (nextLocale: AppLocale) => {
    if (pendingLocale || nextLocale === locale) {
      if (nextLocale === locale) closeAndFocus();
      return;
    }
    setPendingLocale(nextLocale);
    setSyncFailed(false);
    const result = await changeApplicationLocale(nextLocale, {
      isAuthenticated,
      setCookie: setLocaleCookie,
      updateProfile: updateCurrentUserPreferredLocale,
      refresh: router.refresh,
    });
    setSyncFailed(result.profileSyncFailed);
    setPendingLocale(null);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`language-switcher language-switcher--${variant}`}>
      <button
        ref={triggerRef}
        type="button"
        className={variant === "profile" ? "pr-row language-switcher__profile-trigger" : "language-switcher__trigger"}
        aria-label={translate("selectorLabel")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        disabled={pendingLocale !== null}
      >
        {variant === "profile" ? (
          <>
            <span className="pr-row__icon" aria-hidden="true">🌍</span>
            <span className="pr-row__label">{profileTranslate("title")}</span>
            <span className="pr-row__value">{activeOption.nativeName}</span>
            <span className="pr-row__arrow" aria-hidden="true">›</span>
          </>
        ) : (
          <>
            <span aria-hidden="true">🌐</span>
            <span>{pendingLocale ? getLanguageOption(pendingLocale).code : activeOption.code}</span>
            {pendingLocale && <span className="language-switcher__spinner" aria-hidden="true">…</span>}
          </>
        )}
      </button>

      {open && (
        <div className="language-switcher__menu" role="menu" aria-label={translate("selectorLabel")}>
          {LANGUAGE_OPTIONS.map((option) => {
            const active = option.locale === locale;
            return (
              <button
                key={option.locale}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                className="language-switcher__option"
                onClick={() => void selectLocale(option.locale)}
                disabled={pendingLocale !== null}
              >
                <span>{option.nativeName}</span>
                <span aria-hidden="true">{active ? "✓" : ""}</span>
              </button>
            );
          })}
        </div>
      )}

      {syncFailed && (
        <p className="language-switcher__warning" role="status">
          {translate("syncError")}
        </p>
      )}
    </div>
  );
}
