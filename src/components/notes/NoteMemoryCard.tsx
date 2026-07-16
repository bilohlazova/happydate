import type { SyntheticEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { AppLocale } from "@/i18n/config";

import {
  getNotesCardPresentation,
} from "@/lib/memories/notesMemoryTypes";
import { normalizeStoredMemoryType } from "@/lib/repositories/memory.types";
import type {
  NotesMemoryPerson,
  NotesMemoryRow,
} from "@/lib/repositories/memory.types";

interface NoteMemoryCardProps {
  memory: NotesMemoryRow;
  person: NotesMemoryPerson | null;
  displayImageUrls: string[];
  menuOpen: boolean;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  onEdit: (memory: NotesMemoryRow) => void;
  onDelete: (memoryId: string) => void;
  onOpenLightbox: (urls: string[], index: number) => void;
}

const RELATION_COLORS: Record<string, { bg: string; text: string }> = {
  family: { bg: "#e8f0fe", text: "#1a4a9e" },
  friend: { bg: "#e8f5ed", text: "#1a6644" },
  partner: { bg: "#fce8ed", text: "#8a1a38" },
  work: { bg: "#fdf6e8", text: "#7a5c1a" },
  other: { bg: "#f0ede8", text: "#5a5550" },
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function hideFailedImage(event: SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.parentElement?.setAttribute("hidden", "");
}

export default function NoteMemoryCard({
  memory,
  person,
  displayImageUrls,
  menuOpen,
  onMenuToggle,
  onMenuClose,
  onEdit,
  onDelete,
  onOpenLightbox,
}: NoteMemoryCardProps) {
  const t = useTranslations("notes");
  const locale = useLocale() as AppLocale;
  const presentation = getNotesCardPresentation({
    normalizedType: normalizeStoredMemoryType(memory.type),
    title: memory.title,
    valueText: memory.value_text,
    contentText: memory.content_text,
    occurredOn: memory.occurred_on,
    createdAt: memory.created_at,
    personName: person?.name ?? null,
    imageCount: memory.images?.length ?? 0,
    locale,
    labels: {
      typeLabels: { note: t("types.note"), memory: t("types.memory"), gift: t("types.gift"), journal: t("types.journal"), other: t("types.other") },
      fallbackTitles: { note: t("types.note"), memory: t("types.memory"), gift: t("card.giftFallback"), journal: t("card.journalFallback"), other: t("types.other") },
      emptyContent: { note: t("card.noNoteContent"), memory: t("card.noMemoryContent"), gift: t("card.noGiftContent"), journal: t("card.noJournalContent"), other: t("card.noContent") },
      personMeta: (name) => t("card.personMeta", { name }),
      imageCount: (count) => t("card.imageCount", { count }),
      today: t("dates.today"), yesterday: t("dates.yesterday"),
      daysAgo: (count) => t("dates.daysAgo", { count }), unknownDate: t("dates.unknown"),
    },
  });
  const visiblePerson = presentation.visiblePersonName ? person : null;
  const relationColor = visiblePerson
    ? RELATION_COLORS[visiblePerson.relation ?? "other"] ?? RELATION_COLORS.other
    : RELATION_COLORS.other;
  const previewUrls = displayImageUrls.slice(0, 2);
  const remainingPreviewCount = Math.max(displayImageUrls.length - 2, 0);
  const tags = memory.ai_tags ?? [];

  return (
    <article
      className={`hd-card hd-card-${presentation.displayType}`}
      onClick={() => {
        if (menuOpen) onMenuClose();
      }}
    >
      <div className="hd-card-body">
        <div className="hd-card-header">
          <div
            className="hd-card-kind"
            style={{
              background: presentation.background,
              color: presentation.color,
            }}
          >
            <span aria-hidden="true">{presentation.icon}</span>
            {presentation.typeLabel}
          </div>

          <div className="hd-card-menu-wrap" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="hd-card-menu-btn"
              onClick={onMenuToggle}
              aria-label={t("card.options")}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              •••
            </button>
            {menuOpen && (
              <div className="hd-card-menu-popup" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className="hd-card-menu-item"
                  onClick={() => {
                    onMenuClose();
                    onEdit(memory);
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M11 2l3 3-8 8H3v-3l8-8z" />
                  </svg>
                  {t("actions.edit")}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="hd-card-menu-item danger"
                  onClick={() => {
                    onMenuClose();
                    onDelete(memory.id);
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="2,4 14,4" />
                    <path d="M5 4V2h6v2M6 7v5M10 7v5" />
                    <path d="M3 4l1 9h8l1-9" />
                  </svg>
                  {t("actions.delete")}
                </button>
              </div>
            )}
          </div>
        </div>

        {presentation.showTitle && (
          <div className="hd-card-title-row">
            {presentation.titleUsesPerson && visiblePerson && (
              <div
                className="hd-card-avatar"
                style={{ background: relationColor.bg, color: relationColor.text }}
                aria-hidden="true"
              >
                {getInitials(visiblePerson.name)}
              </div>
            )}
            <h2 className="hd-card-title">{presentation.title}</h2>
          </div>
        )}

        <div className="hd-card-meta">
          {presentation.metaParts.map((part, index) => (
            <span key={part}>
              {index > 0 && <span className="hd-card-meta-separator" aria-hidden="true">·</span>}
              {part}
            </span>
          ))}
        </div>

        <div className={`hd-card-text${presentation.contentIsFallback ? " is-fallback" : ""}`}>
          {presentation.content}
        </div>

        {tags.length > 0 && (
          <div className="hd-card-tags">
            {tags.slice(0, 5).map((tag) => (
              <span key={tag} className="hd-tag">{tag}</span>
            ))}
          </div>
        )}
      </div>

      {previewUrls.length > 0 && (
        <div className={`hd-card-images${previewUrls.length > 1 ? " is-grid" : ""}`}>
          {previewUrls.map((url, index) => (
            <button
              key={`${url}-${index}`}
              type="button"
              className="hd-card-image-button"
              onClick={(event) => {
                event.stopPropagation();
                onOpenLightbox(displayImageUrls, index);
              }}
              aria-label={t("accessibility.openImage", { index: index + 1, count: displayImageUrls.length })}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={t("accessibility.imageAlt", { title: presentation.title })}
                loading="lazy"
                onError={hideFailedImage}
              />
              {index === 1 && remainingPreviewCount > 0 && (
                <span className="hd-card-image-more" aria-hidden="true">
                  +{remainingPreviewCount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
