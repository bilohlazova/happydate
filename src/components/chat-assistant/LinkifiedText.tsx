import { parseMessageLinks } from "@/lib/assistant/messageLinks";

interface LinkifiedTextProps {
  text: string;
  /** Extra classes for the <a> element (colors, etc.). */
  linkClassName?: string;
}

const DEFAULT_LINK_CLASS =
  "rounded-sm font-semibold text-sky-700 underline decoration-sky-300 underline-offset-2 transition hover:text-sky-900 hover:decoration-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300";

/**
 * Renders assistant text with http(s) URLs and Markdown links as real anchors.
 * Output is built from React nodes only (never raw HTML), so model-provided
 * markup can never execute. Text segments are kept verbatim, so the parent's
 * `whitespace-pre-wrap` keeps line breaks and spacing intact.
 */
export default function LinkifiedText({ text, linkClassName = DEFAULT_LINK_CLASS }: LinkifiedTextProps) {
  return (
    <>
      {parseMessageLinks(text).map((segment, index) =>
        segment.type === "link" ? (
          <a
            key={index}
            href={segment.href}
            target="_blank"
            rel="noopener noreferrer"
            title={segment.href}
            className={`${linkClassName} [overflow-wrap:anywhere]`}
          >
            {segment.label}
          </a>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}
