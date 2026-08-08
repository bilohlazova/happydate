const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const XML_SENSITIVE_CHARACTERS = /[<>&]/g;

/**
 * WebKit converts SpeechSynthesisUtterance text to SSML internally. Keep the
 * input plain and predictable so user-entered event titles cannot break it.
 */
export function normalizeSpeechText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(CONTROL_CHARACTERS, " ")
    .replace(XML_SENSITIVE_CHARACTERS, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function splitSpeechText(value: string, maxLength = 220): string[] {
  const normalized = normalizeSpeechText(value);
  if (!normalized) return [];
  if (maxLength < 40) throw new RangeError("maxLength must be at least 40");

  const chunks: string[] = [];
  let remaining = normalized;

  while (remaining.length > maxLength) {
    const window = remaining.slice(0, maxLength + 1);
    const sentenceBreak = Math.max(
      window.lastIndexOf(". "),
      window.lastIndexOf("! "),
      window.lastIndexOf("? "),
    );
    const commaBreak = Math.max(window.lastIndexOf(", "), window.lastIndexOf("; "));
    const whitespaceBreak = window.lastIndexOf(" ");
    const splitAt = sentenceBreak >= Math.floor(maxLength * 0.45)
      ? sentenceBreak + 1
      : commaBreak >= Math.floor(maxLength * 0.6)
        ? commaBreak + 1
        : whitespaceBreak > 0
          ? whitespaceBreak
          : maxLength;

    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

export function selectSpeechVoice(
  voices: readonly SpeechSynthesisVoice[],
  locale: string,
): SpeechSynthesisVoice | null {
  const requested = locale.toLowerCase();
  const language = requested.split("-")[0];
  return voices.find((voice) => voice.lang.toLowerCase() === requested)
    ?? voices.find((voice) => voice.lang.toLowerCase().split("-")[0] === language)
    ?? null;
}
