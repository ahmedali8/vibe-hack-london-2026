// OpenAI client for generating gentle, cycle-aware daily to-dos.
//
// The API key is read from an environment variable (EXPO_PUBLIC_OPENAI_API_KEY),
// configured in a local, gitignored .env file. See .env.example.
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY?.trim();
const OPENAI_BASE_URL =
  process.env.EXPO_PUBLIC_OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
const OPENAI_MODEL = process.env.EXPO_PUBLIC_OPENAI_MODEL ?? 'gpt-4o-mini';

export function hasGlmApiKey(): boolean {
  return Boolean(OPENAI_API_KEY);
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
  if (!Array.isArray(parsed)) throw new Error('OpenAI did not return an array');
  return parsed
    .filter((t) => t && typeof t.task === 'string')
    .slice(0, 3)
    .map((t) => ({ emoji: typeof t.emoji === 'string' ? t.emoji : '•', task: String(t.task) }));
}

export async function getDailyTasks(ctx: TaskContext): Promise<DailyTask[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('Missing EXPO_PUBLIC_OPENAI_API_KEY');
  }
  const base = OPENAI_BASE_URL.replace(/\/$/, '');
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.7,
      max_tokens: 300,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(ctx) },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`OpenAI request failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  const data = await res.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned no content');
  return parseTasks(content);
}
