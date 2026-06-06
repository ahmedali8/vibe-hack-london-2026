import type { DailyPlan, DailyState, Meal, OvaraProfile, Workout } from './storage';

const ZAI_BASE_URL =
  process.env.EXPO_PUBLIC_ZAI_BASE_URL ?? 'https://api.z.ai/api/coding/paas/v4';
const ZAI_MODEL = process.env.EXPO_PUBLIC_ZAI_MODEL ?? 'GLM-5';

export type WorkoutTip = { emoji: string; title: string; body: string };

export type LlmPlanPayload = {
  dietInsight: string;
  meals: Meal[];
  workoutInsight: string;
  workout: Workout;
  workoutTips: WorkoutTip[];
};

export function hasLlmApiKey(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_ZAI_API_KEY?.trim());
}

async function zaiChat(system: string, user: string): Promise<string | null> {
  const apiKey = process.env.EXPO_PUBLIC_ZAI_API_KEY?.trim();
  if (!apiKey) return null;

  const base = ZAI_BASE_URL.replace(/\/$/, '');
  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: ZAI_MODEL,
      temperature: 0.5,
      max_tokens: 1200,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Z.AI error ${response.status}: ${detail.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() ?? null;
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) return fenced[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text;
}

function normalizeMeals(raw: unknown): Meal[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((m, i) => {
      const item = m as Record<string, unknown>;
      return {
        id: String(item.id ?? ['breakfast', 'lunch', 'snack', 'dinner'][i] ?? `meal-${i}`),
        label: String(item.label ?? 'Meal'),
        title: String(item.title ?? ''),
        note: String(item.note ?? ''),
        emoji: String(item.emoji ?? '🌿'),
      };
    })
    .filter((m) => m.title.length > 0)
    .slice(0, 4);
}

function normalizeWorkout(raw: unknown): Workout | null {
  if (!raw || typeof raw !== 'object') return null;
  const w = raw as Record<string, unknown>;
  const title = String(w.title ?? '');
  if (!title) return null;
  return {
    title,
    duration: String(w.duration ?? '20 min'),
    intensity: String(w.intensity ?? 'Gentle'),
    note: String(w.note ?? ''),
    emoji: String(w.emoji ?? '🧘🏻‍♀️'),
  };
}

function normalizeTips(raw: unknown): WorkoutTip[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((t) => {
      const item = t as Record<string, unknown>;
      return {
        emoji: String(item.emoji ?? '✨'),
        title: String(item.title ?? ''),
        body: String(item.body ?? ''),
      };
    })
    .filter((t) => t.title && t.body)
    .slice(0, 3);
}

export function parseLlmPlanResponse(text: string): LlmPlanPayload | null {
  try {
    const parsed = JSON.parse(extractJson(text)) as Record<string, unknown>;
    const meals = normalizeMeals(parsed.meals);
    const workout = normalizeWorkout(parsed.workout);
    if (meals.length < 3 || !workout) return null;

    return {
      dietInsight: String(parsed.dietInsight ?? '').trim(),
      meals,
      workoutInsight: String(parsed.workoutInsight ?? '').trim(),
      workout,
      workoutTips: normalizeTips(parsed.workoutTips),
    };
  } catch {
    return null;
  }
}

type PlanContext = {
  profile: OvaraProfile;
  phase: { phase: string; label: string; dayOfCycle: number; blurb: string };
  state: DailyState;
};

const SYSTEM_PROMPT = `You are Ovara — a warm wellness companion for women with PCOS and/or endometriosis.
Return ONLY valid JSON (no markdown prose outside the JSON).
Tone: gentle, lowercase-friendly, never clinical, never alarming. Not medical advice.
Meals should respect diet preferences and support blood sugar / inflammation where relevant.
Workout should match cycle phase and fitness level — gentle when appropriate.`;

export async function generatePersonalizedPlan(
  ctx: PlanContext,
): Promise<LlmPlanPayload | null> {
  const { profile, phase, state } = ctx;
  const userPrompt = `Create today's personalized diet and workout plan.

Profile:
- name: ${profile.name}
- diagnosis: ${profile.diagnosis.join(', ') || 'not specified'}
- symptoms: ${profile.symptoms.join(', ') || 'none logged'}
- diet preference: ${profile.diet}
- fitness level: ${profile.fitness}

Cycle:
- phase: ${phase.label} (day ${phase.dayOfCycle})
- phase note: ${phase.blurb}

Today so far:
- water: ${state.waterMl} ml
- coffee cups: ${state.coffeeCount}

Return JSON exactly in this shape:
{
  "dietInsight": "2 short warm sentences about today's nourishment focus",
  "meals": [
    { "id": "breakfast", "label": "Breakfast", "title": "...", "note": "...", "emoji": "🍓" },
    { "id": "lunch", "label": "Lunch", "title": "...", "note": "...", "emoji": "🥗" },
    { "id": "snack", "label": "Snack", "title": "...", "note": "...", "emoji": "🌰" },
    { "id": "dinner", "label": "Dinner", "title": "...", "note": "...", "emoji": "🍲" }
  ],
  "workoutInsight": "2 short warm sentences about today's movement focus",
  "workout": {
    "title": "...",
    "duration": "20 min",
    "intensity": "Gentle|Moderate",
    "note": "...",
    "emoji": "🧘🏻‍♀️"
  },
  "workoutTips": [
    { "emoji": "🌿", "title": "...", "body": "..." },
    { "emoji": "🧘", "title": "...", "body": "..." },
    { "emoji": "🌙", "title": "...", "body": "..." }
  ]
}`;

  const raw = await zaiChat(SYSTEM_PROMPT, userPrompt);
  if (!raw) return null;
  return parseLlmPlanResponse(raw);
}

export function applyLlmPlan(plan: DailyPlan, llm: LlmPlanPayload): DailyPlan {
  return {
    ...plan,
    meals: llm.meals,
    workout: llm.workout,
    dietInsight: llm.dietInsight,
    workoutInsight: llm.workoutInsight,
    workoutTips: llm.workoutTips,
    source: 'llm',
  };
}
