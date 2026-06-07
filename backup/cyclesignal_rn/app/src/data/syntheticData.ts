import { CycleEntry, FunctionalImpactType, MoodType, Severity } from '../types';
import { createId } from '../lib/id';
import { addDays, toISODate } from '../lib/cycle';

// Demo user "Amara" — PRD Section 8.
// 6 cycles, lengths 42/38/55/61/44/39 (irregular, PCOS-consistent). Premenstrual mood
// crashes (sev 4-5), functional impact in 4 of 6, acne in 3 of 6, fatigue in 5 of 6.
// No safety-trigger language. All entries source: "synthetic".

const LENGTHS: Record<number, number> = { 1: 42, 2: 38, 3: 55, 4: 61, 5: 44, 6: 39 };
const FUNCTIONAL_IMPACT_CYCLES = new Set([1, 2, 3, 4]); // 4 of 6
const ACNE_CYCLES = new Set([2, 4, 6]); // 3 of 6
const FATIGUE_CYCLES = new Set([1, 2, 3, 4, 5]); // 5 of 6
const IMPACT_TYPES: FunctionalImpactType[][] = [['missed_work'], ['cancelled_plans']];

function emptyEntry(
  date: string,
  cycleDay: number,
  cycleNumber: number,
  consentTimestamp: string
): CycleEntry {
  return {
    id: createId(),
    date,
    cycleDay,
    cycleNumber,
    mood: null,
    physical: { pain: null, acne: false, hairGrowth: false, fatigue: null, sleep: null, bloating: false, other: [] },
    bleeding: { started: false, ended: false, flow: null },
    functionalImpact: { present: false, types: [], severity: null },
    medications: [],
    emotionSnapshot: null,
    conversationTranscript: '',
    source: 'synthetic',
    safetyFlagged: false,
    consentTimestamp,
  };
}

export function generateSyntheticEntries(consentTimestamp: string): CycleEntry[] {
  const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00');
  const todayISO = toISODate(today);

  // Anchor: current cycle (6) is on day 24 today (PRD: "You're on day 24").
  const starts: Record<number, Date> = {};
  starts[6] = addDays(today, -23);
  for (let n = 5; n >= 1; n--) starts[n] = addDays(starts[n + 1], -LENGTHS[n]);

  const entries: CycleEntry[] = [];

  for (let n = 1; n <= 6; n++) {
    const L = LENGTHS[n];
    const start = starts[n];
    const at = (day: number) => toISODate(addDays(start, day - 1));

    // Menstruation, days 1-4
    const bleed: Array<[number, 'medium' | 'light', boolean, boolean]> = [
      [1, 'medium', true, false],
      [2, 'medium', false, false],
      [3, 'light', false, false],
      [4, 'light', false, true],
    ];
    for (const [day, flow, started, ended] of bleed) {
      const e = emptyEntry(at(day), day, n, consentTimestamp);
      e.bleeding = { started, ended, flow };
      entries.push(e);
    }

    // Acne mid-cycle (day 10) for selected cycles
    if (ACNE_CYCLES.has(n)) {
      const e = emptyEntry(at(10), 10, n, consentTimestamp);
      e.physical.acne = true;
      entries.push(e);
    }

    // Premenstrual mood crashes — days L-6, L-4, L-2
    const premen: Array<{ day: number; sev: Severity; types: MoodType[]; sudden: boolean }> = [
      { day: L - 6, sev: 4, types: ['low'], sudden: false },
      { day: L - 4, sev: 5, types: ['low', 'tearful'], sudden: true },
      { day: L - 2, sev: 4, types: ['low', 'irritable'], sudden: false },
    ];
    premen.forEach((p, idx) => {
      const e = emptyEntry(at(p.day), p.day, n, consentTimestamp);
      e.mood = { present: true, types: p.types, severity: p.sev, suddenOnset: p.sudden };
      if (FATIGUE_CYCLES.has(n) && idx === 1) {
        e.physical.fatigue = { present: true, severity: 4 };
        e.physical.sleep = { disrupted: true, nightsAffected: 3 };
      }
      if (FUNCTIONAL_IMPACT_CYCLES.has(n) && idx === 2) {
        e.functionalImpact = {
          present: true,
          types: IMPACT_TYPES[n % IMPACT_TYPES.length],
          severity: 'moderate',
        };
      }
      entries.push(e);
    });
  }

  // Never seed entries in the future (the current cycle is only partway through).
  return entries
    .filter((e) => e.date <= todayISO)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// The cycle/day a fresh voice check-in should attach to (current cycle, today).
export function currentCyclePosition(): { cycleNumber: number; cycleDay: number } {
  return { cycleNumber: 6, cycleDay: 24 };
}
