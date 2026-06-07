// Safety layer — PRD Feature 5 / Section 5.5.
// Hard-coded, deterministic RegExp matcher. Runs on every text input and every
// transcript turn BEFORE any AI processing. It is never delegated to a model and
// cannot be overridden. This is the absolute safety floor (Constraint #2).

const SAFETY_KEYWORDS: RegExp[] = [
  /\b(suicid|kill myself|end my life|don't want to be here|want to die)\b/i,
  /\b(self.?harm|cutting|hurt myself|hurting myself)\b/i,
  /\b(overdose|take all my pills)\b/i,
  /\b(can't go on|no point in living|nobody would miss me)\b/i,
];

export function checkSafety(text: string): boolean {
  return SAFETY_KEYWORDS.some((pattern) => pattern.test(text));
}

// Secondary trigger on EVI 3 prosody scores — PRD Section 6 emotion detection.
export function checkEmotionSafety(emotionScores: Record<string, number>): boolean {
  const distress =
    (emotionScores.Distress ?? 0) + (emotionScores.Fear ?? 0) + (emotionScores.Sadness ?? 0);
  return distress > 0.75; // high-confidence distress threshold
}

// Secondary classifier layer — PRD Section 5.5 (Anthropic Claude Haiku 4.5, async).
// This NEVER replaces the hard-coded RegExp primary: callers run `checkSafety`
// first and synchronously, then use this only to catch nuanced phrasing the
// RegExp missed. Returns null when the backend/key is unavailable.
export async function classifyCrisisSecondary(text: string): Promise<boolean | null> {
  // Imported lazily to keep the deterministic primary layer free of any network
  // dependency (Constraint #2: the floor must work with no server, no key).
  const { remoteSafetyClassify } = await import('./api');
  return remoteSafetyClassify(text);
}

// Hard-coded crisis resources — PRD Feature 5 / Constraint #10. Numbers must match exactly.
export const SAFETY_RESOURCES = [
  { name: 'Samaritans', detail: '116 123 (free, 24/7) · jo@samaritans.org', tel: '116123' },
  { name: 'Shout Crisis Text Line', detail: 'Text SHOUT to 85258 (free, 24/7)', tel: '85258' },
  { name: 'NHS 111', detail: 'Call 111 and select the mental health option', tel: '111' },
  { name: '999 or A&E', detail: 'If you are in immediate danger', tel: '999' },
];

export const SAFETY_COPY = {
  headline: 'It sounds like you might be going through something very difficult right now.',
  body: "You don't have to face this alone. Please reach out to one of these services:",
  footer:
    'CycleSignal AI is not able to provide crisis support. Please contact one of the services above.',
};
