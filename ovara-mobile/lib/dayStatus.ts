import { phaseForDay, phaseRanges, type CyclePhase } from './storage';
import { CYCLE_DAY_DATA } from './cycleDayData';

// Map a user's cycle day to the canonical (28-day) data index, anchored by
// phase + position-within-phase so it stays aligned with the wheel's phases
// even when the user's cycle length differs from 28.
function toCanonicalDay(day: number, cycleLength: number, periodLength: number): number {
  const ranges = phaseRanges(cycleLength, periodLength);
  const canon = phaseRanges(CYCLE_DAY_DATA.canonicalLength, 5);
  const r = ranges.find((x) => day >= x.start && day <= x.end) ?? ranges[0];
  const cr = canon.find((x) => x.key === r.key) ?? canon[0];
  const span = Math.max(1, r.end - r.start);
  const frac = (day - r.start) / span;
  const cday = Math.round(cr.start + frac * (cr.end - cr.start));
  return Math.min(CYCLE_DAY_DATA.canonicalLength, Math.max(1, cday));
}

export type DayStatus = { line: string; phase: CyclePhase; crampsPct: number; restingHr: number };

export function dayStatus(day: number, cycleLength: number, periodLength: number): DayStatus {
  const phase = phaseForDay(day, cycleLength, periodLength);
  const ranges = phaseRanges(cycleLength, periodLength);
  const r = ranges.find((x) => x.key === phase) ?? ranges[0];
  const cd = toCanonicalDay(day, cycleLength, periodLength);

  const crampsPct = Math.round(CYCLE_DAY_DATA.crampsPct[cd - 1]);
  const restingHr = Math.round(CYCLE_DAY_DATA.restingHr[cd - 1]);

  let line: string;
  if (phase === 'menstrual') {
    if (day === r.start) line = `Cramps often peak today (~${crampsPct}%) — keep warm`;
    else if (day === r.start + 1) line = 'Cramps easing — still be gentle';
    else line = 'Flow winding down — rest as you need';
  } else if (phase === 'follicular') {
    const mid = (r.start + r.end) / 2;
    line =
      day <= mid
        ? 'Energy climbing back — ease into movement'
        : 'Recovery is strong — a good day to move';
  } else if (phase === 'ovulatory') {
    const mid = Math.round((r.start + r.end) / 2);
    line = day === mid ? 'Ovulation likely today — fertile peak' : 'Fertile window — energy is high';
  } else {
    line =
      day >= cycleLength - 3
        ? `PMS window — cravings likely, recovery lower (HR ~${restingHr})`
        : 'Winding down — recovery starts to dip';
  }

  return { line, phase, crampsPct, restingHr };
}
