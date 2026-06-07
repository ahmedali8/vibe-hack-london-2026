// Non-diagnostic post-processing filter — PRD Constraint #1 / Section 5.3 fallback.
// The pattern narrative must never imply a diagnosis. This runs server-side on the
// Gemini output; if it fails, the route returns 422 so the client falls back to its
// deterministic on-device narrative (which is guaranteed safe).

const DIAGNOSTIC_PHRASES: RegExp[] = [
  /\byou have\b/i,
  /\byou are suffering from\b/i,
  /\bdiagnos/i,
  /\byou(?:'| a)re (?:pcos|pmdd)\b/i,
  /\bcaused by\b/i,
  /\byou (?:likely |probably )?have (?:pcos|pmdd)\b/i,
];

export function isNonDiagnostic(text: string): boolean {
  return !DIAGNOSTIC_PHRASES.some((p) => p.test(text));
}
