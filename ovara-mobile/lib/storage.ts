import * as SecureStore from 'expo-secure-store';

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';

export type OvaraProfile = {
  name: string;
  cycleStatus: string;
  diagnosis: string[];
  symptoms: string[];
  diet: string;
  fitness: string;
  cycleStartDate: string;
  completedAt: string;
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

const KEYS = {
  profile: 'ovara.profile.v1',
  plan: 'ovara.plan.v1',
  state: 'ovara.state.v1',
} as const;

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
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

export function computePhase(cycleStartDate: string, today = new Date()) {
  const start = new Date(cycleStartDate);
  const ms = today.getTime() - start.getTime();
  const day = Math.max(1, Math.floor(ms / (1000 * 60 * 60 * 24)) + 1);
  const dayOfCycle = ((day - 1) % 28) + 1;

  let phase: CyclePhase;
  if (dayOfCycle <= 5) phase = 'menstrual';
  else if (dayOfCycle <= 13) phase = 'follicular';
  else if (dayOfCycle <= 16) phase = 'ovulatory';
  else phase = 'luteal';

  const meta = {
    menstrual: { label: 'Menstrual phase', blurb: 'Slow down. Warm food, gentle stretches, lots of rest.', emoji: '🌙' },
    follicular: { label: 'Follicular phase', blurb: 'Energy is rising. A lovely time to move.', emoji: '🌱' },
    ovulatory: { label: 'Ovulatory phase', blurb: 'Feeling bright? Channel it into something you love.', emoji: '✨' },
    luteal: { label: 'Luteal phase', blurb: 'Settle inward. Cozy food and softer workouts.', emoji: '🌸' },
  }[phase];

  return { phase, dayOfCycle, ...meta };
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
