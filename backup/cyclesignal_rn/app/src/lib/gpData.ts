import { CycleEntry, PatternFlags } from '../types';
import { Cycle } from './cycle';

export type SymptomRow = {
  name: string;
  cycles: number;
  window: string;
  avgSeverity: string;
};

export type GPData = {
  overview: {
    cyclesTracked: number;
    avgLength: number;
    range: string;
    cyclesOver35: number;
    missedPeriods: number;
  };
  symptomRows: SymptomRow[];
  functionalText: string;
  pcosPoints: string[];
  pmddPoints: string[];
  redFlag: boolean;
};

function cyclesWith(cycles: Cycle[], pred: (e: CycleEntry) => boolean): Cycle[] {
  return cycles.filter((c) => c.entries.some(pred));
}

function dayWindow(cycles: Cycle[], pred: (e: CycleEntry) => boolean): string {
  const days: number[] = [];
  for (const c of cycles) for (const e of c.entries) if (pred(e)) days.push(e.cycleDay);
  if (!days.length) return '—';
  const lo = Math.min(...days);
  const hi = Math.max(...days);
  return lo === hi ? `Day ${lo}` : `Days ${lo}–${hi}`;
}

function avgSeverity(cycles: Cycle[], get: (e: CycleEntry) => number | null): string {
  const vals: number[] = [];
  for (const c of cycles)
    for (const e of c.entries) {
      const v = get(e);
      if (v != null) vals.push(v);
    }
  if (!vals.length) return '—';
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
}

export function computeGPData(
  entries: CycleEntry[],
  cycles: Cycle[],
  flags: PatternFlags
): GPData {
  const recent = cycles.slice(-6);
  const total = recent.length;

  const rows: SymptomRow[] = [];
  const push = (name: string, pred: (e: CycleEntry) => boolean, sev?: (e: CycleEntry) => number | null) => {
    const n = cyclesWith(recent, pred).length;
    if (n > 0)
      rows.push({
        name,
        cycles: n,
        window: dayWindow(recent, pred),
        avgSeverity: sev ? avgSeverity(recent, sev) : '—',
      });
  };

  push('Low / unstable mood', (e) => !!e.mood?.present, (e) => e.mood?.severity ?? null);
  push('Pain', (e) => !!e.physical.pain?.present, (e) => e.physical.pain?.severity ?? null);
  push('Fatigue', (e) => !!e.physical.fatigue?.present, (e) => e.physical.fatigue?.severity ?? null);
  push('Disrupted sleep', (e) => !!e.physical.sleep?.disrupted);
  push('Acne', (e) => e.physical.acne);
  push('Excess hair growth', (e) => e.physical.hairGrowth);
  push('Bloating', (e) => e.physical.bloating);
  push('Bleeding', (e) => e.bleeding.started);

  const fiCycles = cyclesWith(recent, (e) => e.functionalImpact.present).length;
  const functionalText = `The user reported missing work or cancelling plans in ${fiCycles} of ${total} cycles due to symptoms.`;

  const missedPeriods = recent.filter((c) => !c.entries.some((e) => e.bleeding.started)).length;

  const pcosPoints: string[] = [];
  if (flags.pcosSignal) {
    if (flags.irregularCycles)
      pcosPoints.push(`Irregular cycles (range ${flags.cycleLengthRange}, ${flags.cyclesOver35Days} over 35 days)`);
    if (flags.acneCycles > 0) pcosPoints.push(`Acne logged in ${flags.acneCycles} cycles`);
    if (cyclesWith(recent, (e) => e.physical.hairGrowth).length > 0)
      pcosPoints.push('Excess hair growth reported');
    if (flags.fatigueCycles > 0) pcosPoints.push(`Fatigue logged in ${flags.fatigueCycles} cycles`);
  }

  const pmddPoints: string[] = [];
  if (flags.pmddSignal) {
    pmddPoints.push(
      `Premenstrual mood symptoms in ${flags.premenstrualMoodCycles} of ${total} cycles (${flags.premenstrualWindowLabel})`
    );
    pmddPoints.push('Mood symptoms reported to ease after bleeding begins');
    pmddPoints.push(`Functional impact (missed work / cancelled plans) in ${fiCycles} of ${total} cycles`);
  }

  const redFlag = entries.some((e) => e.safetyFlagged);

  return {
    overview: {
      cyclesTracked: total,
      avgLength: flags.averageCycleLength,
      range: flags.cycleLengthRange,
      cyclesOver35: flags.cyclesOver35Days,
      missedPeriods,
    },
    symptomRows: rows,
    functionalText,
    pcosPoints,
    pmddPoints,
    redFlag,
  };
}
