/** Capitalize the first letter of each sentence (notes, insights, tip bodies). */
export function toSentenceCase(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return trimmed
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/([.!?…]\s+)([a-z])/g, (_, punct, letter) => punct + letter.toUpperCase());
}

/** Title Case for small card headings (meal names, workout titles, tips). */
export function toCardTitle(text: string): string {
  return text
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      // Preserve emoji-only tokens
      if (/^[\p{Emoji}\p{Emoji_Component}]+$/u.test(word)) return word;
      const parts = word.split(/([+\/&\-–—])/);
      return parts
        .map((part) => {
          if (!part || /^[+\/&\-–—]$/.test(part)) return part;
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        })
        .join('');
    })
    .join(' ');
}
