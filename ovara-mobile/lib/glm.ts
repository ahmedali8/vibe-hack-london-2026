// Generates gentle, cycle-aware daily to-dos through the shared AI layer
// (lib/aiChat.ts): Claude primary, GLM fallback. One key set drives the whole app.
import { chat, hasAiKey } from './aiChat';

export function hasGlmApiKey(): boolean {
  return hasAiKey();
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
  if (!Array.isArray(parsed)) throw new Error('AI did not return an array');
  return parsed
    .filter((t) => t && typeof t.task === 'string')
    .slice(0, 3)
    .map((t) => ({ emoji: typeof t.emoji === 'string' ? t.emoji : '•', task: String(t.task) }));
}

export async function getDailyTasks(ctx: TaskContext): Promise<DailyTask[]> {
  const content = await chat(SYSTEM_PROMPT, buildUserPrompt(ctx), {
    maxTokens: 300,
    temperature: 0.7,
    primary: 'claude', // Claude-first; GLM is the fallback
  });
  if (!content) throw new Error('AI returned no content for daily tasks');
  return parseTasks(content);
}
