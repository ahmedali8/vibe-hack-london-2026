import { CycleEntry } from '../types';
import { colors } from '../theme/colors';

// --- Date helpers (UTC-safe, date-only) ---
export function parseISO(d: string): Date {
  return new Date(d + 'T00:00:00');
}
export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
export function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}
export function monthLabel(d: Date): string {
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}
export function prettyDate(iso: string): string {
  return parseISO(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export type Cycle = {
  cycleNumber: number;
  startDate: string;
  label: string;
  length: number;
  isIrregular: boolean;
  entries: CycleEntry[];
};

// Group entries into cycles and derive length from the gap between successive cycle starts.
export function buildCycles(entries: CycleEntry[]): Cycle[] {
  const byNumber = new Map<number, CycleEntry[]>();
  for (const e of entries) {
    const arr = byNumber.get(e.cycleNumber) ?? [];
    arr.push(e);
    byNumber.set(e.cycleNumber, arr);
  }
  const numbers = [...byNumber.keys()].sort((a, b) => a - b);
  const starts = new Map<number, Date>();
  for (const n of numbers) {
    const dates = byNumber.get(n)!.map((e) => parseISO(e.date).getTime());
    starts.set(n, new Date(Math.min(...dates)));
  }
  const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00');

  return numbers.map((n, i) => {
    const start = starts.get(n)!;
    const cycleEntries = byNumber.get(n)!.slice().sort((a, b) => a.cycleDay - b.cycleDay);
    let length: number;
    if (i < numbers.length - 1) {
      length = diffDays(starts.get(numbers[i + 1])!, start);
    } else {
      // Current cycle: longest known so far, but at least days elapsed.
      const maxDay = Math.max(...cycleEntries.map((e) => e.cycleDay));
      length = Math.max(maxDay, diffDays(today, start) + 1);
    }
    return {
      cycleNumber: n,
      startDate: toISODate(start),
      label: `Cycle ${n} — ${monthLabel(start)}`,
      length,
      isIrregular: length > 35,
      entries: cycleEntries,
    };
  });
}

export type CellCategory = 'none' | 'bleeding' | 'moodLow' | 'moodMid' | 'moodHigh' | 'physical';

export type Cell = {
  cycleNumber: number;
  cycleDay: number;
  category: CellCategory;
  color: string;
  hasFunctionalImpact: boolean;
  safetyFlagged: boolean;
  entry: CycleEntry | null;
  premenstrual: boolean; // within days -10..-1 of cycle length
};

// Dominant-symptom colour for a single cell — PRD Feature 2 / Section 0.7.
function categorise(entry: CycleEntry | null): { category: CellCategory; color: string } {
  if (!entry) return { category: 'none', color: colors.cellNoData };
  if (entry.bleeding.started || (entry.bleeding.flow && entry.bleeding.flow !== 'none')) {
    return { category: 'bleeding', color: colors.cellBleeding };
  }
  if (entry.mood?.present) {
    const s = entry.mood.severity;
    if (s >= 4) return { category: 'moodHigh', color: colors.cellMoodHigh };
    if (s === 3) return { category: 'moodMid', color: colors.cellMoodMid };
    return { category: 'moodLow', color: colors.cellMoodLow };
  }
  const physical =
    entry.physical.pain?.present ||
    entry.physical.fatigue?.present ||
    entry.physical.acne ||
    entry.physical.hairGrowth ||
    entry.physical.bloating;
  if (physical) return { category: 'physical', color: colors.cellPhysical };
  return { category: 'none', color: colors.cellNoData };
}

// Build the full heatmap grid: one row per cycle, columns up to the longest cycle.
export function buildHeatmap(cycles: Cycle[]): { maxDay: number; rows: Cell[][] } {
  const maxDay = Math.min(65, Math.max(1, ...cycles.map((c) => c.length)));
  const rows = cycles.map((cycle) => {
    const byDay = new Map<number, CycleEntry>();
    for (const e of cycle.entries) byDay.set(e.cycleDay, e);
    const cells: Cell[] = [];
    for (let day = 1; day <= maxDay; day++) {
      const entry = byDay.get(day) ?? null;
      const { category, color } = categorise(entry);
      const premenstrual = day > cycle.length - 10 && day <= cycle.length;
      cells.push({
        cycleNumber: cycle.cycleNumber,
        cycleDay: day,
        category,
        color,
        hasFunctionalImpact: !!entry?.functionalImpact.present,
        safetyFlagged: !!entry?.safetyFlagged,
        entry,
        premenstrual,
      });
    }
    return cells;
  });
  return { maxDay, rows };
}

// Human-readable symptom list for an entry (tooltip + history).
export function describeEntry(entry: CycleEntry): string[] {
  const out: string[] = [];
  if (entry.mood?.present) {
    out.push(`Mood: ${entry.mood.types.join(', ') || 'low'} (severity ${entry.mood.severity})`);
  }
  if (entry.physical.pain?.present) out.push(`Pain (severity ${entry.physical.pain.severity})`);
  if (entry.physical.fatigue?.present)
    out.push(`Fatigue (severity ${entry.physical.fatigue.severity})`);
  if (entry.physical.sleep?.disrupted)
    out.push(`Disrupted sleep (${entry.physical.sleep.nightsAffected} nights)`);
  if (entry.physical.acne) out.push('Acne');
  if (entry.physical.hairGrowth) out.push('Hair growth');
  if (entry.physical.bloating) out.push('Bloating');
  if (entry.bleeding.started || (entry.bleeding.flow && entry.bleeding.flow !== 'none'))
    out.push(`Bleeding${entry.bleeding.flow ? ` (${entry.bleeding.flow})` : ''}`);
  if (entry.functionalImpact.present)
    out.push(`Functional impact: ${entry.functionalImpact.types.join(', ')}`);
  if (entry.medications.length) out.push(`Medications: ${entry.medications.join(', ')}`);
  return out.length ? out : ['No symptoms logged'];
}
