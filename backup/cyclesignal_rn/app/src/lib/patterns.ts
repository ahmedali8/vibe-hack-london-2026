import { CycleEntry, PatternFlags } from '../types';
import { buildCycles, Cycle } from './cycle';

// Deterministic Pattern Agent — PRD Section 6.3 / Section 10.
// Pure TypeScript rules, run first and always. No AI involved here.

function moodInPremenstrualWindow(cycle: Cycle): boolean {
  return cycle.entries.some(
    (e) =>
      e.mood?.present &&
      e.mood.severity >= 3 &&
      e.cycleDay >= cycle.length - 10 &&
      e.cycleDay <= cycle.length - 1
  );
}

function cycleHasFunctionalImpact(cycle: Cycle): boolean {
  return cycle.entries.some((e) => e.functionalImpact.present);
}
function cycleHasAcneOrHair(cycle: Cycle): boolean {
  return cycle.entries.some((e) => e.physical.acne || e.physical.hairGrowth);
}
function cycleHasFatigue(cycle: Cycle): boolean {
  return cycle.entries.some((e) => e.physical.fatigue?.present);
}

export function analysePatterns(entries: CycleEntry[]): PatternFlags {
  // Use the most recent 6 cycles, oldest-first.
  const allCycles = buildCycles(entries);
  const cycles = allCycles.slice(-6);

  const lengths = cycles.map((c) => c.length);
  const shortest = lengths.length ? Math.min(...lengths) : 0;
  const longest = lengths.length ? Math.max(...lengths) : 0;
  const average = lengths.length
    ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length)
    : 0;
  const variance = longest - shortest;
  const cyclesOver35 = lengths.filter((l) => l > 35).length;

  const premenstrualMoodCycles = cycles.filter(moodInPremenstrualWindow).length;
  const functionalImpactCycles = cycles.filter(cycleHasFunctionalImpact).length;
  const acneCycles = cycles.filter((c) => c.entries.some((e) => e.physical.acne)).length;
  const fatigueCycles = cycles.filter(cycleHasFatigue).length;
  const acneOrHairCycles = cycles.filter(cycleHasAcneOrHair).length;

  // Rule evaluation (PRD 6.3 table)
  const irregularCycles = cyclesOver35 >= 2 || variance > 10;
  const premenstrualMoodClustering = premenstrualMoodCycles >= 3;
  const repeatedFunctionalImpact = functionalImpactCycles >= 3;
  const pcosSignal = irregularCycles && acneOrHairCycles >= 2;
  const pmddSignal = premenstrualMoodClustering && functionalImpactCycles >= 1;

  // Premenstrual window described relative to period start (cycle lengths vary).
  const offsets: number[] = [];
  for (const c of cycles) {
    for (const e of c.entries) {
      if (e.mood?.present && e.mood.severity >= 3 && e.cycleDay >= c.length - 10) {
        offsets.push(c.length - e.cycleDay);
      }
    }
  }
  let premenstrualWindowLabel = 'the days before each period';
  if (offsets.length) {
    const lo = Math.min(...offsets);
    const hi = Math.max(...offsets);
    premenstrualWindowLabel =
      lo === hi ? `${lo} days before each period` : `${lo}–${hi} days before each period`;
  }

  return {
    irregularCycles,
    premenstrualMoodClustering,
    repeatedFunctionalImpact,
    pcosSignal,
    pmddSignal,
    cyclesTracked: cycles.length,
    averageCycleLength: average,
    cycleLengthRange: lengths.length ? `${shortest}–${longest} days` : '—',
    shortestCycle: shortest,
    longestCycle: longest,
    cyclesOver35Days: cyclesOver35,
    premenstrualMoodCycles,
    functionalImpactCycles,
    acneCycles,
    fatigueCycles,
    premenstrualWindowLabel,
  };
}

// Active pattern labels for chips / GP pack (PRD 6.3 output labels).
export function patternLabels(flags: PatternFlags): string[] {
  const labels: string[] = [];
  if (flags.irregularCycles) labels.push('Irregular cycle pattern detected');
  if (flags.premenstrualMoodClustering) labels.push('Premenstrual mood pattern detected');
  if (flags.repeatedFunctionalImpact) labels.push('Repeated functional impact detected');
  if (flags.pcosSignal) labels.push('PCOS-relevant symptoms present');
  if (flags.pmddSignal) labels.push('PMDD-relevant pattern present');
  return labels;
}
