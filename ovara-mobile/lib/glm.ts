// GLM client for generating gentle, cycle-aware daily to-dos.
//
// Uses the same Z.AI GLM key + Coding API as the plan generator (lib/llm.ts) so a
// single hackathon key drives the whole app. Falls back to the legacy GLM vars.
// Keys are read from a local, gitignored .env file. See .env.example.
const GLM_API_KEY =
  process.env.EXPO_PUBLIC_ZAI_API_KEY?.trim() ?? process.env.EXPO_PUBLIC_GLM_API_KEY?.trim();
const GLM_BASE = (
  process.env.EXPO_PUBLIC_ZAI_BASE_URL ?? 'https://api.z.ai/api/coding/paas/v4'
).replace(/\/$/, '');
const GLM_URL = `${GLM_BASE}/chat/completions`;
const GLM_MODEL = process.env.EXPO_PUBLIC_ZAI_MODEL ?? 'GLM-4.7';

export function hasGlmApiKey(): boolean {
  return Boolean(GLM_API_KEY);
}

export type DailyTask = { emoji: string; task: string };

export type TaskContext = {
  name: string;
  dayOfCycle: number;
  cycleLength: number;
  phaseLabel: string;
  status: string;
  diet?: string;
  fitness?: string;
  symptoms?: string[];
};

const SYSTEM_PROMPT =
  'You are Ovara, a warm, cycle-aware wellness companion for people with PCOS and Endometriosis. ' +
  'Given the cycle day and what the data says is happening, return exactly 3 small, gentle, ' +
  'genuinely actionable to-do tasks for today, tuned to the phase and any symptoms. ' +
  'Respond ONLY as a compact JSON array of objects with keys "emoji" and "task". ' +
  'Each task must be <= 8 words, kind in tone, and non-clinical. No prose, no markdown, no code fences.';

function buildUserPrompt(c: TaskContext): string {
  const parts = [
    `Name: ${c.name}.`,
    `Cycle day ${c.dayOfCycle} of ${c.cycleLength}.`,
    `Phase: ${c.phaseLabel}.`,
    `What is happening: ${c.status}.`,
  ];
  if (c.diet) parts.push(`Diet: ${c.diet}.`);
  if (c.fitness) parts.push(`Fitness level: ${c.fitness}.`);
  if (c.symptoms?.length) parts.push(`Common symptoms: ${c.symptoms.join(', ')}.`);
  return parts.join(' ');
}

function parseTasks(content: string): DailyTask[] {
  const cleaned = content
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  const json = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed)) throw new Error('GLM did not return an array');
  return parsed
    .filter((t) => t && typeof t.task === 'string')
    .slice(0, 3)
    .map((t) => ({ emoji: typeof t.emoji === 'string' ? t.emoji : '•', task: String(t.task) }));
}

export async function getDailyTasks(ctx: TaskContext): Promise<DailyTask[]> {
  if (!GLM_API_KEY) {
    throw new Error('Missing EXPO_PUBLIC_ZAI_API_KEY');
  }
  const res = await fetch(GLM_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GLM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GLM_MODEL,
      temperature: 0.7,
      max_tokens: 300,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(ctx) },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`GLM request failed (${res.status})`);
  }
  const data = await res.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('GLM returned no content');
  return parseTasks(content);
}
