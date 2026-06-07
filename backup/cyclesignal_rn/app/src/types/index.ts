// Data schema — PRD Section 9. CycleEntry is the only structure persisted.

export type MoodType = 'low' | 'anxious' | 'irritable' | 'tearful' | 'angry' | 'hopeless';
export type Severity = 1 | 2 | 3 | 4 | 5;

export type MoodEntry = {
  present: boolean;
  types: MoodType[];
  severity: Severity;
  suddenOnset: boolean;
};

export type PhysicalEntry = {
  pain: { present: boolean; severity: Severity } | null;
  acne: boolean;
  hairGrowth: boolean;
  fatigue: { present: boolean; severity: Severity } | null;
  sleep: { disrupted: boolean; nightsAffected: number } | null;
  bloating: boolean;
  other: string[];
};

export type FlowLevel = 'none' | 'spotting' | 'light' | 'medium' | 'heavy';

export type BleedingEntry = {
  started: boolean;
  ended: boolean;
  flow: FlowLevel | null;
};

export type FunctionalImpactType =
  | 'missed_work'
  | 'cancelled_plans'
  | 'relationship_disruption'
  | 'unable_to_care_for_self';

export type FunctionalImpact = {
  present: boolean;
  types: FunctionalImpactType[];
  severity: 'mild' | 'moderate' | 'severe' | null;
};

export type EmotionSnapshot = {
  distress: number; // 0-1 from EVI 3 prosody scores
  sadness: number;
  fear: number;
  calmness: number;
};

export type EntrySource = 'voice' | 'text' | 'synthetic';

export type CycleEntry = {
  id: string;
  date: string; // ISO 8601 date
  cycleDay: number; // 1-indexed day within its cycle
  cycleNumber: number; // 1 = oldest cycle
  mood: MoodEntry | null;
  physical: PhysicalEntry;
  bleeding: BleedingEntry;
  functionalImpact: FunctionalImpact;
  medications: string[];
  emotionSnapshot: EmotionSnapshot | null;
  conversationTranscript: string; // plain text, max 2000 chars, no audio
  source: EntrySource;
  safetyFlagged: boolean;
  consentTimestamp: string;
};

// Deterministic pattern flags — PRD Section 6.3.
export type PatternFlags = {
  irregularCycles: boolean;
  premenstrualMoodClustering: boolean;
  repeatedFunctionalImpact: boolean;
  pcosSignal: boolean;
  pmddSignal: boolean;
  // Supporting stats used in narrative + GP pack
  cyclesTracked: number;
  averageCycleLength: number;
  cycleLengthRange: string; // e.g. "38–61 days"
  shortestCycle: number;
  longestCycle: number;
  cyclesOver35Days: number;
  premenstrualMoodCycles: number; // how many cycles showed premenstrual mood
  functionalImpactCycles: number;
  acneCycles: number;
  fatigueCycles: number;
  premenstrualWindowLabel: string; // e.g. "days 22–27"
};

export type PatternAnalysis = {
  flags: PatternFlags;
  labels: string[]; // active pattern labels
  narrative: string;
  narrativeModel: 'gemini-3.1-flash' | 'gpt-5.4-mini-fallback' | 'on-device';
  updatedAt: string;
};

// GP pack section visibility — PRD Section 6.4 / Privacy export toggles.
export type GPSectionKey =
  | 'patientStatement'
  | 'cycleOverview'
  | 'symptomTimeline'
  | 'symptomSummary'
  | 'functionalImpact'
  | 'pcosPoints'
  | 'pmddPoints'
  | 'redFlags';

export type GPSectionToggles = Record<GPSectionKey, boolean>;
