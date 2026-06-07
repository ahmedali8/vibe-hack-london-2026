import { randomUUID } from 'node:crypto';
import { z } from 'zod';

// Symptom-extraction contract — PRD Section 5.2 / Section 9.
// GPT-5.4 Mini (real: gpt-4o-mini) returns this flat, fully-required shape via
// OpenAI Structured Outputs (`strict: true`). Flat primitives keep us inside the
// strict-mode rules (every field required, no nullable objects). The server then
// assembles the full typed `CycleEntry` the client persists.

export const MOOD_TYPES = ['low', 'anxious', 'irritable', 'tearful', 'angry', 'hopeless'] as const;
export const FUNCTIONAL_TYPES = [
  'missed_work',
  'cancelled_plans',
  'relationship_disruption',
  'unable_to_care_for_self',
] as const;
export const FLOW_LEVELS = ['none', 'spotting', 'light', 'medium', 'heavy'] as const;
export const FI_SEVERITY = ['none', 'mild', 'moderate', 'severe'] as const;

// JSON schema handed to OpenAI (strict structured outputs).
export const extractionJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    moodPresent: { type: 'boolean' },
    moodTypes: { type: 'array', items: { type: 'string', enum: MOOD_TYPES } },
    moodSeverity: { type: 'integer', description: '0 if no mood symptom, else 1-5' },
    moodSuddenOnset: { type: 'boolean' },
    painPresent: { type: 'boolean' },
    painSeverity: { type: 'integer', description: '0 if no pain, else 1-5' },
    acne: { type: 'boolean' },
    hairGrowth: { type: 'boolean' },
    fatiguePresent: { type: 'boolean' },
    fatigueSeverity: { type: 'integer', description: '0 if no fatigue, else 1-5' },
    sleepDisrupted: { type: 'boolean' },
    sleepNightsAffected: { type: 'integer' },
    bloating: { type: 'boolean' },
    bleedingStarted: { type: 'boolean' },
    bleedingEnded: { type: 'boolean' },
    flow: { type: 'string', enum: FLOW_LEVELS },
    functionalImpactPresent: { type: 'boolean' },
    functionalImpactTypes: { type: 'array', items: { type: 'string', enum: FUNCTIONAL_TYPES } },
    functionalImpactSeverity: { type: 'string', enum: FI_SEVERITY },
    medications: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'moodPresent',
    'moodTypes',
    'moodSeverity',
    'moodSuddenOnset',
    'painPresent',
    'painSeverity',
    'acne',
    'hairGrowth',
    'fatiguePresent',
    'fatigueSeverity',
    'sleepDisrupted',
    'sleepNightsAffected',
    'bloating',
    'bleedingStarted',
    'bleedingEnded',
    'flow',
    'functionalImpactPresent',
    'functionalImpactTypes',
    'functionalImpactSeverity',
    'medications',
  ],
} as const;

export const extractionSchema = z.object({
  moodPresent: z.boolean(),
  moodTypes: z.array(z.enum(MOOD_TYPES)),
  moodSeverity: z.number().int(),
  moodSuddenOnset: z.boolean(),
  painPresent: z.boolean(),
  painSeverity: z.number().int(),
  acne: z.boolean(),
  hairGrowth: z.boolean(),
  fatiguePresent: z.boolean(),
  fatigueSeverity: z.number().int(),
  sleepDisrupted: z.boolean(),
  sleepNightsAffected: z.number().int(),
  bloating: z.boolean(),
  bleedingStarted: z.boolean(),
  bleedingEnded: z.boolean(),
  flow: z.enum(FLOW_LEVELS),
  functionalImpactPresent: z.boolean(),
  functionalImpactTypes: z.array(z.enum(FUNCTIONAL_TYPES)),
  functionalImpactSeverity: z.enum(FI_SEVERITY),
  medications: z.array(z.string()),
});
export type Extraction = z.infer<typeof extractionSchema>;

// Emotion snapshot from EVI 3 prosody — PRD Section 9. Stored, never diagnostic.
export const emotionSnapshotSchema = z
  .object({
    distress: z.number(),
    sadness: z.number(),
    fear: z.number(),
    calmness: z.number(),
  })
  .nullable();

// The context the client supplies alongside the transcript (cycle position etc.).
export const extractRequestSchema = z.object({
  transcript: z.string().max(8000),
  cycleDay: z.number().int().positive(),
  cycleNumber: z.number().int().positive(),
  consentTimestamp: z.string(),
  date: z.string().optional(),
  source: z.enum(['voice', 'text', 'synthetic']).default('voice'),
  emotionSnapshot: emotionSnapshotSchema.default(null),
});
export type ExtractRequest = z.infer<typeof extractRequestSchema>;

function clampSeverity(n: number): 1 | 2 | 3 | 4 | 5 {
  return Math.max(1, Math.min(5, Math.round(n))) as 1 | 2 | 3 | 4 | 5;
}

// Map the flat model output + request context into the full CycleEntry the client
// stores verbatim (PRD Section 9). Mirrors the on-device extractor's output shape
// so the client treats server and on-device results identically.
export function assembleCycleEntry(x: Extraction, ctx: ExtractRequest) {
  return {
    id: randomUUID(),
    date: ctx.date ?? new Date().toISOString().slice(0, 10),
    cycleDay: ctx.cycleDay,
    cycleNumber: ctx.cycleNumber,
    mood: x.moodPresent
      ? {
          present: true,
          types: x.moodTypes.length ? x.moodTypes : ['low'],
          severity: clampSeverity(x.moodSeverity || 3),
          suddenOnset: x.moodSuddenOnset,
        }
      : null,
    physical: {
      pain: x.painPresent ? { present: true, severity: clampSeverity(x.painSeverity || 3) } : null,
      acne: x.acne,
      hairGrowth: x.hairGrowth,
      fatigue: x.fatiguePresent
        ? { present: true, severity: clampSeverity(x.fatigueSeverity || 4) }
        : null,
      sleep: x.sleepDisrupted
        ? { disrupted: true, nightsAffected: Math.max(0, x.sleepNightsAffected) }
        : null,
      bloating: x.bloating,
      other: [] as string[],
    },
    bleeding: {
      started: x.bleedingStarted,
      ended: x.bleedingEnded,
      flow: x.flow === 'none' ? null : x.flow,
    },
    functionalImpact: {
      present: x.functionalImpactPresent,
      types: x.functionalImpactTypes,
      severity: x.functionalImpactSeverity === 'none' ? null : x.functionalImpactSeverity,
    },
    medications: x.medications,
    emotionSnapshot: ctx.emotionSnapshot,
    conversationTranscript: ctx.transcript.slice(0, 2000),
    source: ctx.source,
    safetyFlagged: false,
    consentTimestamp: ctx.consentTimestamp,
  };
}

// The extraction system prompt — PRD 5.2 / 6.1. Non-diagnostic, extract-only.
export const EXTRACTION_SYSTEM = `You extract structured menstrual-cycle symptom data from a short conversation transcript between a health-tracking assistant ("CycleSignal") and a user.

Rules:
- Extract ONLY what the user explicitly states or clearly implies. Do not invent symptoms.
- If a symptom is not mentioned, set its boolean to false and its severity to 0.
- Severities are 1 (mild) to 5 (severe). Use 0 only to mean "not present".
- Never produce a diagnosis or clinical label. You only structure what was said.
- "sudden onset" / "crash" / "out of nowhere" → moodSuddenOnset true.
- Functional impact = missing work, cancelling plans, relationship strain, or being unable to care for oneself.
- medications: only list a medication/supplement if the user named one.`;
