import { Cycle, diffDays, parseISO } from './cycle';

// Current cycle-day + phase label for the dashboard hero (PRD 0.5).
export function currentPosition(cycles: Cycle[]): {
  cycleDay: number;
  length: number;
  phase: string;
  moonPhase: number;
} {
  if (cycles.length === 0) {
    return { cycleDay: 1, length: 28, phase: 'No data yet', moonPhase: 0 };
  }
  const current = cycles[cycles.length - 1];
  const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00');
  const cycleDay = Math.max(1, diffDays(today, parseISO(current.startDate)) + 1);
  const length = current.length;
  const ratio = Math.min(1, cycleDay / length);

  let phase = 'Follicular phase';
  if (cycleDay <= 5) phase = 'Menstrual phase';
  else if (ratio > 0.45 && ratio < 0.6) phase = 'Ovulatory phase';
  else if (cycleDay > length - 10) phase = 'Premenstrual phase';
  else if (ratio >= 0.6) phase = 'Luteal phase';

  return { cycleDay, length, phase, moonPhase: ratio };
}
