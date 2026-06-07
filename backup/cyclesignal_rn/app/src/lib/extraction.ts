import {
  CycleEntry,
  EmotionSnapshot,
  EntrySource,
  MoodType,
  Severity,
} from '../types';
import { createId } from './id';
import { remoteExtract } from './api';

// Extraction Agent — PRD Section 5.2 / 6.1.
// Production stack uses EVI 3's store_symptom_entry tool call + GPT-5.4 Mini. Here we
// derive a typed CycleEntry from the plain-text transcript on-device (no key, no server).

function clampSeverity(n: number): Severity {
  return Math.max(1, Math.min(5, Math.round(n))) as Severity;
}

const NUM_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
};

function nightsFrom(text: string): number {
  const m = text.match(/(\d+)\s*(?:day|night)/i);
  if (m) return parseInt(m[1], 10);
  for (const [w, n] of Object.entries(NUM_WORDS)) {
    if (new RegExp(`\\b${w}\\b\\s*(?:day|night)`, 'i').test(text)) return n;
  }
  return 0;
}

export type ExtractionContext = {
  transcript: string;
  cycleDay: number;
  cycleNumber: number;
  consentTimestamp: string;
  emotionSnapshot: EmotionSnapshot | null;
  source: EntrySource;
};

export function extractEntry(ctx: ExtractionContext): CycleEntry {
  const t = ctx.transcript.toLowerCase();

  // --- Mood ---
  const moodTypes: MoodType[] = [];
  if (/\b(low|down|crash|couldn'?t get out of bed|empty|flat)\b/.test(t)) moodTypes.push('low');
  if (/\b(anxious|anxiety|on edge|panicky)\b/.test(t)) moodTypes.push('anxious');
  if (/\b(irritable|snappy|frustrated)\b/.test(t)) moodTypes.push('irritable');
  if (/\b(tearful|crying|cried)\b/.test(t)) moodTypes.push('tearful');
  if (/\b(angry|rage)\b/.test(t)) moodTypes.push('angry');
  if (/\b(hopeless|pointless)\b/.test(t)) moodTypes.push('hopeless');

  let moodSeverity = 3;
  if (/\b(really|so|very|extremely|completely)\b/.test(t)) moodSeverity = 4;
  if (/\b(couldn'?t get out of bed|crash|worst)\b/.test(t)) moodSeverity = 5;
  const suddenOnset = /\b(sudden|crash|out of nowhere|hits)\b/.test(t);
  const mood =
    moodTypes.length > 0
      ? { present: true, types: moodTypes, severity: clampSeverity(moodSeverity), suddenOnset }
      : null;

  // --- Physical ---
  const painPresent = /\b(pain|cramp|ache|sore)\b/.test(t);
  const fatiguePresent = /\b(tired|exhausted|fatigue|drained|no energy)\b/.test(t);
  const sleepDisrupted = /\b(sleep|insomnia|haven'?t slept|can'?t sleep|awake)\b/.test(t);

  const physical = {
    pain: painPresent ? { present: true, severity: clampSeverity(/\bbad|severe|really\b/.test(t) ? 4 : 3) } : null,
    acne: /\b(acne|breakout|spots|skin)\b/.test(t),
    hairGrowth: /\b(hair growth|hirsut|facial hair)\b/.test(t),
    fatigue: fatiguePresent ? { present: true, severity: clampSeverity(4) } : null,
    sleep: sleepDisrupted ? { disrupted: true, nightsAffected: nightsFrom(t) || 1 } : null,
    bloating: /\b(bloat|bloated|swollen)\b/.test(t),
    other: [] as string[],
  };

  // --- Bleeding ---
  const bleeding = {
    started: /\b(period started|bleeding|on my period|came on)\b/.test(t),
    ended: /\b(period (?:ended|finished|stopped))\b/.test(t),
    flow: (/\bheavy\b/.test(t) ? 'heavy' : /\blight\b/.test(t) ? 'light' : null) as
      | 'heavy'
      | 'light'
      | null,
  };

  // --- Functional impact ---
  const fiTypes: CycleEntry['functionalImpact']['types'] = [];
  if (/\b(missed work|off work|called in sick|cancelled a meeting|couldn'?t work)\b/.test(t))
    fiTypes.push('missed_work');
  if (/\b(cancelled|cancel plans|stayed in|couldn'?t go)\b/.test(t)) fiTypes.push('cancelled_plans');
  if (/\b(argument|relationship|partner|fell out)\b/.test(t)) fiTypes.push('relationship_disruption');
  if (/\b(couldn'?t look after myself|couldn'?t care for)\b/.test(t))
    fiTypes.push('unable_to_care_for_self');
  const functionalImpact = {
    present: fiTypes.length > 0,
    types: fiTypes,
    severity: (fiTypes.length > 1 ? 'moderate' : fiTypes.length === 1 ? 'mild' : null) as
      | 'mild'
      | 'moderate'
      | null,
  };

  // --- Medications ---
  const medications: string[] = [];
  const medMatch = t.match(/\b(?:taking|on|started)\s+([a-z]+(?:\s+pill)?)\b/);
  if (medMatch && /pill|metformin|ssri|sertraline|ibuprofen|paracetamol/.test(medMatch[1]))
    medications.push(medMatch[1]);

  return {
    id: createId(),
    date: new Date().toISOString().slice(0, 10),
    cycleDay: ctx.cycleDay,
    cycleNumber: ctx.cycleNumber,
    mood,
    physical,
    bleeding,
    functionalImpact,
    medications,
    emotionSnapshot: ctx.emotionSnapshot,
    conversationTranscript: ctx.transcript.slice(0, 2000),
    source: ctx.source,
    safetyFlagged: false,
    consentTimestamp: ctx.consentTimestamp,
  };
}

// Build a CycleEntry directly from EVI 3's `store_symptom_entry` tool-call args
// (PRD 6.1 — the extraction happens mid-conversation via the tool call). Defensive
// mapping of the nested tool schema; missing fields default to absent. Mirrors the
// on-device extractor's output shape so downstream code never branches.
type ToolArgs = Record<string, any>;
export function buildEntryFromToolArgs(
  args: ToolArgs,
  ctx: Omit<ExtractionContext, 'transcript'> & { transcript: string }
): CycleEntry {
  const sev = (v: unknown): Severity => clampSeverity(typeof v === 'number' ? v : 3);
  const present = (m: any): m is Record<string, any> => !!m && m.present === true;

  const moodMap = args.mood;
  const mood: CycleEntry['mood'] = present(moodMap)
    ? {
        present: true,
        types: (Array.isArray(moodMap.types) ? moodMap.types : []).map(String) as MoodType[],
        severity: sev(moodMap.severity),
        suddenOnset: moodMap.suddenOnset === true,
      }
    : null;

  const sleepMap = args.sleep;
  const bleedMap = args.bleeding ?? {};
  const fiMap = args.functionalImpact ?? {};

  return {
    id: createId(),
    date: new Date().toISOString().slice(0, 10),
    cycleDay: ctx.cycleDay,
    cycleNumber: ctx.cycleNumber,
    mood,
    physical: {
      pain: present(args.pain) ? { present: true, severity: sev(args.pain.severity) } : null,
      acne: args.acne === true,
      hairGrowth: args.hairGrowth === true,
      fatigue: present(args.fatigue) ? { present: true, severity: sev(args.fatigue.severity) } : null,
      sleep:
        sleepMap && sleepMap.disrupted === true
          ? {
              disrupted: true,
              nightsAffected: typeof sleepMap.nightsAffected === 'number' ? sleepMap.nightsAffected : 1,
            }
          : null,
      bloating: args.bloating === true,
      other: [],
    },
    bleeding: {
      started: bleedMap.started === true,
      ended: bleedMap.ended === true,
      flow: bleedMap.flow && bleedMap.flow !== 'none' ? bleedMap.flow : null,
    },
    functionalImpact: {
      present: fiMap.present === true,
      types: (Array.isArray(fiMap.types) ? fiMap.types : []).map(String) as CycleEntry['functionalImpact']['types'],
      severity: fiMap.severity && fiMap.severity !== 'none' ? fiMap.severity : null,
    },
    medications: (Array.isArray(args.medications) ? args.medications : []).map(String),
    emotionSnapshot: ctx.emotionSnapshot,
    conversationTranscript: ctx.transcript.slice(0, 2000),
    source: ctx.source,
    safetyFlagged: false,
    consentTimestamp: ctx.consentTimestamp,
  };
}

// Production path: try the backend (GPT-5.4 Mini / gpt-4o-mini structured outputs)
// first, fall back to the on-device extractor when the server/key is unavailable.
// Either way the result is the same typed CycleEntry, so callers don't branch.
export async function extractEntrySmart(ctx: ExtractionContext): Promise<CycleEntry> {
  const remote = await remoteExtract({
    transcript: ctx.transcript,
    cycleDay: ctx.cycleDay,
    cycleNumber: ctx.cycleNumber,
    consentTimestamp: ctx.consentTimestamp,
    source: ctx.source,
    emotionSnapshot: ctx.emotionSnapshot,
  });
  return remote ?? extractEntry(ctx);
}
