/**
 * Safe link tokenizer for assistant chat messages.
 *
 * Turns plain text that may contain bare URLs or Markdown links
 * (`[label](https://...)`) into a list of text / link segments. The UI renders
 * those segments as React nodes, so model output is never inserted as HTML.
 *
 * Only absolute http(s) URLs without embedded credentials become links.
 * Anything else (javascript:, data:, file:, vbscript:, relative, malformed...)
 * stays as inert plain text exactly as the model wrote it.
 */

export type MessageSegment =
  | { type: "text"; text: string }
  | { type: "link"; href: string; label: string };

export const MAX_MESSAGE_LINK_URL_LENGTH = 2_048;
export const MAX_BARE_LINK_LABEL_LENGTH = 48;
export const MAX_MESSAGE_LINKS = 20;

const SAFE_PROTOCOLS = new Set(["http:", "https:"]);
const TRAILING_PUNCTUATION = new Set([".", ",", "!", "?", ";", ":", "'", "\"", "…"]);

// 1: markdown label, 2: markdown target (one level of balanced parentheses),
// 3: bare http(s) URL candidate.
const TOKEN = new RegExp(
  String.raw`\[([^\[\]\n]{1,2100})\]\(\s*((?:[^\s()]|\([^\s()]*\))+)\s*\)` +
    "|" +
    String.raw`(\bhttps?:\/\/[^\s<>"'\u0000-\u001f\u007f]+)`,
  "gi",
);

/** Returns the parsed URL when it is a safe, absolute http(s) URL. */
export function toSafeHttpUrl(value: string): URL | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_MESSAGE_LINK_URL_LENGTH) return null;
  if (/[\s\u0000-\u001f\u007f]/.test(trimmed)) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (!SAFE_PROTOCOLS.has(parsed.protocol) || !parsed.hostname) return null;
  // Credentials in a URL are a classic phishing disguise (https://bank.com@evil.test).
  if (parsed.username || parsed.password) return null;
  return parsed;
}

/** Short, readable label for a URL: host without www + truncated path. */
export function shortUrlLabel(url: URL, maxLength = MAX_BARE_LINK_LABEL_LENGTH): string {
  const host = url.hostname.replace(/^www\./, "");
  const path = `${url.pathname === "/" ? "" : url.pathname}${url.search}`;
  const full = `${host}${path}`;
  if (full.length <= maxLength) return full;
  return `${full.slice(0, Math.max(host.length + 1, maxLength - 1))}…`;
}

function stripTrailingPunctuation(candidate: string): string {
  let end = candidate.length;
  while (end > 0) {
    const char = candidate[end - 1];
    if (TRAILING_PUNCTUATION.has(char)) {
      end -= 1;
      continue;
    }
    // Drop a closing bracket only when it has no opener inside the URL,
    // so "(see https://a.test/x)" works but Wikipedia-style "/Foo_(bar)" survives.
    if (char === ")" || char === "]" || char === "}") {
      const open = char === ")" ? "(" : char === "]" ? "[" : "{";
      const body = candidate.slice(0, end);
      const opens = body.split(open).length - 1;
      const closes = body.split(char).length - 1;
      if (closes > opens) {
        end -= 1;
        continue;
      }
    }
    break;
  }
  return candidate.slice(0, end);
}

function pushText(segments: MessageSegment[], text: string) {
  if (!text) return;
  const last = segments[segments.length - 1];
  if (last?.type === "text") last.text += text;
  else segments.push({ type: "text", text });
}

export function parseMessageLinks(content: string): MessageSegment[] {
  const segments: MessageSegment[] = [];
  if (!content) return segments;

  let cursor = 0;
  let linkCount = 0;
  TOKEN.lastIndex = 0;

  for (let match = TOKEN.exec(content); match; match = TOKEN.exec(content)) {
    const raw = match[0];
    const start = match.index;
    pushText(segments, content.slice(cursor, start));
    cursor = start + raw.length;

    if (linkCount >= MAX_MESSAGE_LINKS) {
      pushText(segments, raw);
      continue;
    }

    if (match[1] !== undefined) {
      // Markdown link. Unsafe targets stay as the literal source text.
      const url = toSafeHttpUrl(match[2]);
      const label = match[1].trim();
      if (!url || !label) {
        pushText(segments, raw);
        continue;
      }
      const labelUrl = /^https?:\/\//i.test(label) ? toSafeHttpUrl(label) : null;
      segments.push({
        type: "link",
        href: url.toString(),
        label: labelUrl ? shortUrlLabel(labelUrl) : label,
      });
      linkCount += 1;
      continue;
    }

    // Bare URL: peel trailing sentence punctuation / unbalanced brackets back into text.
    const candidate = stripTrailingPunctuation(raw);
    const trailing = raw.slice(candidate.length);
    const url = toSafeHttpUrl(candidate);
    if (!url) {
      pushText(segments, raw);
      continue;
    }
    segments.push({ type: "link", href: url.toString(), label: shortUrlLabel(url) });
    linkCount += 1;
    pushText(segments, trailing);
  }

  pushText(segments, content.slice(cursor));
  return segments;
}
