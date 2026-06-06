// Local-first persistence for Ovara. Onboarding answers + daily state live in
// localStorage so the app feels real without requiring signup.

export type CyclePhase = "menstrual" | "follicular" | "ovulatory" | "luteal";

export type OvaraProfile = {
  name: string;
  cycleStatus: string;
  diagnosis: string[];
  symptoms: string[];
  diet: string;
  fitness: string;
  cycleStartDate: string; // ISO date
  completedAt: string;
};

export type Meal = { id: string; label: string; title: string; note: string; emoji: string };
export type Workout = { title: string; duration: string; intensity: string; note: string; emoji: string };

export type DailyPlan = {
  date: string; // YYYY-MM-DD
  meals: Meal[];
  workout: Workout;
  waterGoalMl: number;
};

export type DailyState = {
  date: string;
  waterMl: number;
  coffeeCount: number;
  mood?: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  planUpdate?: PlanUpdate | null;
};

export type PlanUpdate = {
  title: string;
  reason: string;
  changes: { label: string; before?: string; after: string }[];
};

const KEYS = {
  profile: "ovara.profile.v1",
  plan: "ovara.plan.v1",
  state: "ovara.state.v1",
  messages: "ovara.messages.v1",
} as const;

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getProfile(): OvaraProfile | null {
  return read<OvaraProfile>(KEYS.profile);
}
export function saveProfile(p: OvaraProfile) {
  write(KEYS.profile, p);
}

export function getPlan(): DailyPlan | null {
  const p = read<DailyPlan>(KEYS.plan);
  if (p && p.date === todayISO()) return p;
  return null;
}
export function savePlan(p: DailyPlan) {
  write(KEYS.plan, p);
}

export function getState(): DailyState {
  const s = read<DailyState>(KEYS.state);
  if (s && s.date === todayISO()) return s;
  return { date: todayISO(), waterMl: 0, coffeeCount: 0 };
}
export function saveState(s: DailyState) {
  write(KEYS.state, s);
}

export function getMessages(): ChatMessage[] {
  return read<ChatMessage[]>(KEYS.messages) ?? [];
}
export function saveMessages(m: ChatMessage[]) {
  write(KEYS.messages, m);
}

// ----- Cycle math -----

export function computePhase(cycleStartDate: string, today = new Date()): {
  phase: CyclePhase;
  dayOfCycle: number;
  label: string;
  blurb: string;
  emoji: string;
} {
  const start = new Date(cycleStartDate);
  const ms = today.getTime() - start.getTime();
  const day = Math.max(1, Math.floor(ms / (1000 * 60 * 60 * 24)) + 1);
  const dayOfCycle = ((day - 1) % 28) + 1;

  let phase: CyclePhase;
  if (dayOfCycle <= 5) phase = "menstrual";
  else if (dayOfCycle <= 13) phase = "follicular";
  else if (dayOfCycle <= 16) phase = "ovulatory";
  else phase = "luteal";

  const meta = {
    menstrual: { label: "Menstrual phase", blurb: "Slow down. Warm food, gentle stretches, lots of rest.", emoji: "🌙" },
    follicular: { label: "Follicular phase", blurb: "Energy is rising. A lovely time to move.", emoji: "🌱" },
    ovulatory: { label: "Ovulatory phase", blurb: "Feeling bright? Channel it into something you love.", emoji: "✨" },
    luteal: { label: "Luteal phase", blurb: "Settle inward. Cozy food and softer workouts.", emoji: "🌸" },
  }[phase];

  return { phase, dayOfCycle, ...meta };
}

// ----- Default plan generator -----

export function defaultPlan(profile: OvaraProfile | null): DailyPlan {
  const isVegan = profile?.diet?.toLowerCase().includes("vegan");
  const isVeg = profile?.diet?.toLowerCase().includes("vegetarian") || isVegan;

  return {
    date: todayISO(),
    waterGoalMl: 2200,
    meals: [
      {
        id: "breakfast",
        label: "Breakfast",
        title: isVeg ? "Berry chia parfait" : "Soft scrambled eggs + greens",
        note: "Anti-inflammatory start. Add cinnamon for blood sugar.",
        emoji: "🍓",
      },
      {
        id: "lunch",
        label: "Lunch",
        title: isVegan ? "Lemony lentil & kale bowl" : "Salmon, quinoa & roasted veg",
        note: "Omega-3s and fiber to keep you steady.",
        emoji: "🥗",
      },
      {
        id: "snack",
        label: "Snack",
        title: "Flax & almond bites",
        note: "A little something to balance hormones.",
        emoji: "🌰",
      },
      {
        id: "dinner",
        label: "Dinner",
        title: isVeg ? "Roasted squash & tahini" : "Slow-braised chicken & greens",
        note: "Warm, grounding, easy on digestion.",
        emoji: "🍲",
      },
    ],
    workout: {
      title:
        profile?.fitness === "active"
          ? "Pilates flow"
          : profile?.fitness === "gentle"
            ? "Restorative yoga"
            : "Walk + gentle stretch",
      duration: "20 min",
      intensity: profile?.fitness === "active" ? "Moderate" : "Gentle",
      note: "Move only as much as feels good today.",
      emoji: "🧘🏻‍♀️",
    },
  };
}

export function clearAll() {
  if (typeof window === "undefined") return;
  Object.values(KEYS).forEach((k) => window.localStorage.removeItem(k));
}