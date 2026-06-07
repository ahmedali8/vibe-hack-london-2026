#!/usr/bin/env node
// Smoke-test the GLM plan call end-to-end: key + Coding API + model + JSON shape.
// Usage: create .env (see .env.example), then:  node scripts/smoke_glm.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// load .env (no dotenv dependency)
try {
  for (const line of readFileSync(join(ROOT, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {
  console.error('No .env found — copy .env.example to .env and add your key.');
  process.exit(1);
}

const KEY = process.env.EXPO_PUBLIC_ZAI_API_KEY?.trim();
const BASE = (process.env.EXPO_PUBLIC_ZAI_BASE_URL ?? 'https://api.z.ai/api/coding/paas/v4').replace(/\/$/, '');
const MODEL = process.env.EXPO_PUBLIC_ZAI_MODEL ?? 'GLM-5.1';
if (!KEY) { console.error('EXPO_PUBLIC_ZAI_API_KEY missing in .env'); process.exit(1); }
console.log(`→ ${BASE}/chat/completions  model=${MODEL}`);

const system =
  'You are Ovara, a PCOS wellness companion. Return ONLY valid JSON, no markdown. ' +
  'Build meals from the provided PCOS-scored foods. Respect the diet preference.';
const user = `Create a one-day plan.
Diet: Vegetarian. Fitness: Moderate. Phase: Follicular (day 8).
PCOS health score: 62/100 (Good). Weakest: metabolic 50, hormonal 55.
Foods: Soybeans roasted [PCOS 87], Almonds raw [85], Flaxseed [85], Edamame [70], Raspberries [62], Avocado [66], Wheat germ [75], Eggs [55], Mozzarella low sodium [54].
Return JSON: {"dietInsight":"...","meals":[{"id":"breakfast","label":"Breakfast","title":"...","note":"...","emoji":"🍓"},{"id":"lunch","label":"Lunch","title":"...","note":"...","emoji":"🥗"},{"id":"snack","label":"Snack","title":"...","note":"...","emoji":"🌰"},{"id":"dinner","label":"Dinner","title":"...","note":"...","emoji":"🍲"}],"workoutInsight":"...","workout":{"title":"...","duration":"20 min","intensity":"Moderate","note":"...","emoji":"🧘🏻‍♀️"},"workoutTips":[{"emoji":"🌿","title":"...","body":"..."}]}`;

const t0 = Date.now();
const res = await fetch(`${BASE}/chat/completions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
  body: JSON.stringify({
    model: MODEL, temperature: 0.5, max_tokens: 1200,
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
  }),
});
console.log(`HTTP ${res.status} in ${Date.now() - t0}ms`);
if (!res.ok) { console.error('FAIL:', (await res.text()).slice(0, 400)); process.exit(1); }

const data = await res.json();
const content = data.choices?.[0]?.message?.content?.trim();
if (!content) { console.error('FAIL: no content', JSON.stringify(data).slice(0, 400)); process.exit(1); }

// mirror lib/llm.ts extractJson + validation
const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
const jsonStr = fenced?.[1] ?? content.slice(content.indexOf('{'), content.lastIndexOf('}') + 1);
let parsed;
try { parsed = JSON.parse(jsonStr); }
catch (e) { console.error('FAIL: not valid JSON:', e.message, '\n', content.slice(0, 400)); process.exit(1); }

const meals = Array.isArray(parsed.meals) ? parsed.meals.length : 0;
const okWorkout = Boolean(parsed.workout?.title);
console.log(`meals=${meals} workout="${parsed.workout?.title}" tips=${parsed.workoutTips?.length ?? 0}`);
console.log('sample meal:', parsed.meals?.[0]?.title, '—', parsed.meals?.[0]?.note);
if (meals >= 3 && okWorkout) console.log('\n✅ PASS — parser would accept this plan.');
else { console.error('\n❌ FAIL — needs meals>=3 and a workout.title.'); process.exit(1); }
