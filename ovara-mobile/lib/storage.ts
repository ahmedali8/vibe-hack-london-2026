import * as SecureStore from 'expo-secure-store';

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';

// Optional clinical inputs collected during onboarding. All optional — the PCOS
// scorer (lib/pcosScore.ts) is tolerant of missing fields.
export type ClinicalInputs = {
  age?: number;
  heightCm?: number;
  weightKg?: number;
  waistCm?: number;
  hipCm?: number;
  cycleLengthDays?: number;
  // hyperandrogenism / metabolic signs
  hairGrowth?: boolean; // hirsutism
  skinDarkening?: boolean; // acanthosis nigricans
  hairLoss?: boolean;
  acne?: boolean;
  weightGain?: boolean;
  fastFood?: boolean;
  // optional vitals (if known)
  bpSystolic?: number;
  bpDiastolic?: number;
  randomGlucose?: number; // mg/dL
  follicleCount?: number; // per ovary, from ultrasound
  // optional recent bloodwork
  amh?: number;
  lh?: number;
  fsh?: number;
  tsh?: number;
  prl?: number;
  vitD?: number;
};

export type HealthScore = {
  total: number; // 0-100, 100 = healthiest
  level: string;
  subscores: Record<string, number>;
  completeness: number; // 0-1 fraction of dimensions with data
};

export type OvaraProfile = {
  name: string;
  cycleStatus: string;
  diagnosis: string[];
  symptoms: string[];
  diet: string;
  fitness: string;
  cycleStartDate: string;
  completedAt: string;
  clinical?: ClinicalInputs;
  healthScore?: HealthScore;
};

export type Meal = { id: string; label: string; title: string; note: string; emoji: string };
export type Workout = { title: string; duration: string; intensity: string; note: string; emoji: string };

export type WorkoutTip = { emoji: string; title: string; body: string };

export type DailyPlan = {
  date: string;
  meals: Meal[];
  workout: Workout;
  waterGoalMl: number;
  source?: 'default' | 'llm';
  dietInsight?: string;
  workoutInsight?: string;
  workoutTips?: WorkoutTip[];
};

export type DailyState = {
  date: string;
  waterMl: number;
  coffeeCount: number;
  mood?: string;
};

export type PlanUpdate = {
  title: string;
  reason: string;
  changes: { label: string; before?: string; after: string }[];
};

export type PeriodLog = { startDate: string; endDate?: string };

export type DailyTask = { emoji: string; task: string; done?: boolean };

export type DailyTasks = {
  date: string;
  dayOfCycle: number;
  tasks: DailyTask[];
};

export type CycleStats = {
  avgCycleLength: number;
  avgPeriodLength: number;
  lastPeriodStart: string | null;
  nextPeriodDate: string | null;
  cycleCount: number;
  isPrediction: boolean;
};

const DEFAULT_CYCLE_LENGTH = 28;
const DEFAULT_PERIOD_LENGTH = 5;

const KEYS = {
  profile: 'ovara.profile.v1',
  plan: 'ovara.plan.v1',
  state: 'ovara.state.v1',
  periods: 'ovara.periods.v1',
  tasks: 'ovara.tasks.v1',
} as const;

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function addDaysISO(dateISO: string, days: number): string {
  const d = new Date(dateISO);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

async function read<T>(key: string): Promise<T | null> {
  try {
    const raw = await SecureStore.getItemAsync(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function write<T>(key: string, value: T): Promise<void> {
  await SecureStore.setItemAsync(key, JSON.stringify(value));
}

export async function getProfile(): Promise<OvaraProfile | null> {
  return read<OvaraProfile>(KEYS.profile);
}

export async function saveProfile(p: OvaraProfile): Promise<void> {
  await write(KEYS.profile, p);
}

export async function getPlan(): Promise<DailyPlan | null> {
  const p = await read<DailyPlan>(KEYS.plan);
  if (p && p.date === todayISO()) return p;
  return null;
}

export async function savePlan(p: DailyPlan): Promise<void> {
  await write(KEYS.plan, p);
}

export async function getState(): Promise<DailyState> {
  const s = await read<DailyState>(KEYS.state);
  if (s && s.date === todayISO()) return s;
  return { date: todayISO(), waterMl: 0, coffeeCount: 0 };
}

export async function saveState(s: DailyState): Promise<void> {
  await write(KEYS.state, s);
}

export async function clearAll(): Promise<void> {
  await Promise.all(Object.values(KEYS).map((k) => SecureStore.deleteItemAsync(k)));
}

export async function getCachedTasks(): Promise<DailyTasks | null> {
  const t = await read<DailyTasks>(KEYS.tasks);
  if (t && t.date === todayISO()) return t;
  return null;
}

export async function saveCachedTasks(t: DailyTasks): Promise<void> {
  await write(KEYS.tasks, t);
}

export async function getPeriods(): Promise<PeriodLog[]> {
  const list = (await read<PeriodLog[]>(KEYS.periods)) ?? [];
  return list.slice().sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export async function savePeriods(list: PeriodLog[]): Promise<void> {
  await write(KEYS.periods, list);
}

export async function addPeriodStart(startDate: string): Promise<PeriodLog[]> {
  const list = await getPeriods();
  if (!list.some((p) => p.startDate === startDate)) {
    list.push({ startDate });
    list.sort((a, b) => a.startDate.localeCompare(b.startDate));
    await savePeriods(list);
  }
  return list;
}

export async function setPeriodEnd(startDate: string, endDate: string): Promise<PeriodLog[]> {
  const list = await getPeriods();
  const match = list.find((p) => p.startDate === startDate);
  if (match) {
    match.endDate = endDate;
    await savePeriods(list);
  }
  return list;
}

export async function removePeriod(startDate: string): Promise<PeriodLog[]> {
  const list = (await getPeriods()).filter((p) => p.startDate !== startDate);
  await savePeriods(list);
  return list;
}

export function computeCycleStats(periods: PeriodLog[]): CycleStats {
  const starts = periods.map((p) => p.startDate).sort();

  if (starts.length === 0) {
    return {
      avgCycleLength: DEFAULT_CYCLE_LENGTH,
      avgPeriodLength: DEFAULT_PERIOD_LENGTH,
      lastPeriodStart: null,
      nextPeriodDate: null,
      cycleCount: 0,
      isPrediction: false,
    };
  }

  const gaps: number[] = [];
  for (let i = 1; i < starts.length; i++) {
    const gap = daysBetween(starts[i - 1], starts[i]);
    if (gap > 0) gaps.push(gap);
  }
  const avgCycleLength = gaps.length
    ? clamp(Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length), 21, 40)
    : DEFAULT_CYCLE_LENGTH;

  const periodLengths = periods
    .filter((p) => p.endDate)
    .map((p) => daysBetween(p.startDate, p.endDate as string) + 1)
    .filter((n) => n > 0);
  const avgPeriodLength = periodLengths.length
    ? clamp(Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length), 2, 10)
    : DEFAULT_PERIOD_LENGTH;

  const lastPeriodStart = starts[starts.length - 1];

  return {
    avgCycleLength,
    avgPeriodLength,
    lastPeriodStart,
    nextPeriodDate: addDaysISO(lastPeriodStart, avgCycleLength),
    cycleCount: gaps.length,
    isPrediction: gaps.length > 0,
  };
}

export function phaseRanges(
  cycleLength: number = DEFAULT_CYCLE_LENGTH,
  periodLength: number = DEFAULT_PERIOD_LENGTH
): { key: CyclePhase; start: number; end: number }[] {
  const ovulation = cycleLength - 14;
  const periodEnd = clamp(periodLength, 1, ovulation - 3);
  return [
    { key: 'menstrual', start: 1, end: periodEnd },
    { key: 'follicular', start: periodEnd + 1, end: ovulation - 2 },
    { key: 'ovulatory', start: ovulation - 1, end: ovulation + 1 },
    { key: 'luteal', start: ovulation + 2, end: cycleLength },
  ];
}

export function phaseForDay(
  day: number,
  cycleLength: number = DEFAULT_CYCLE_LENGTH,
  periodLength: number = DEFAULT_PERIOD_LENGTH
): CyclePhase {
  const ranges = phaseRanges(cycleLength, periodLength);
  return ranges.find((r) => day >= r.start && day <= r.end)?.key ?? 'menstrual';
}

const PHASE_META: Record<CyclePhase, { label: string; blurb: string; emoji: string }> = {
  menstrual: { label: 'Menstrual phase', blurb: 'Slow down. Warm food, gentle stretches, lots of rest.', emoji: '🌙' },
  follicular: { label: 'Follicular phase', blurb: 'Energy is rising. A lovely time to move.', emoji: '🌱' },
  ovulatory: { label: 'Ovulatory phase', blurb: 'Feeling bright? Channel it into something you love.', emoji: '✨' },
  luteal: { label: 'Luteal phase', blurb: 'Settle inward. Cozy food and softer workouts.', emoji: '🌸' },
};

export function computePhase(
  cycleStartDate: string,
  today = new Date(),
  cycleLength: number = DEFAULT_CYCLE_LENGTH,
  periodLength: number = DEFAULT_PERIOD_LENGTH
) {
  const start = new Date(cycleStartDate);
  const ms = today.getTime() - start.getTime();
  const day = Math.max(1, Math.floor(ms / (1000 * 60 * 60 * 24)) + 1);
  const dayOfCycle = ((day - 1) % cycleLength) + 1;

  const phase = phaseForDay(dayOfCycle, cycleLength, periodLength);
  return { phase, dayOfCycle, cycleLength, ...PHASE_META[phase] };
}

export function defaultPlan(profile: OvaraProfile | null): DailyPlan {
  const isVegan = profile?.diet?.toLowerCase().includes('vegan');
  const isVeg = profile?.diet?.toLowerCase().includes('vegetarian') || isVegan;
  const fitness = profile?.fitness?.toLowerCase() ?? '';

  return {
    date: todayISO(),
    waterGoalMl: 2200,
    meals: [
      {
        id: 'breakfast',
        label: 'Breakfast',
        title: isVeg ? 'Berry chia parfait' : 'Soft scrambled eggs + greens',
        note: 'Anti-inflammatory start. Add cinnamon for blood sugar.',
        emoji: '🍓',
      },
      {
        id: 'lunch',
        label: 'Lunch',
        title: isVegan ? 'Lemony lentil & kale bowl' : 'Salmon, quinoa & roasted veg',
        note: 'Omega-3s and fiber to keep you steady.',
        emoji: '🥗',
      },
      {
        id: 'snack',
        label: 'Snack',
        title: 'Flax & almond bites',
        note: 'A little something to balance hormones.',
        emoji: '🌰',
      },
      {
        id: 'dinner',
        label: 'Dinner',
        title: isVeg ? 'Roasted squash & tahini' : 'Slow-braised chicken & greens',
        note: 'Warm, grounding, easy on digestion.',
        emoji: '🍲',
      },
    ],
    workout: {
      title: fitness === 'active' ? 'Pilates flow' : fitness === 'gentle' ? 'Restorative yoga' : 'Walk + gentle stretch',
      duration: '20 min',
      intensity: fitness === 'active' ? 'Moderate' : 'Gentle',
      note: 'Move only as much as feels good today.',
      emoji: '🧘🏻‍♀️',
    },
  };
}
