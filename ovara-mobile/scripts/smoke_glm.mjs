#!/usr/bin/env node
// Smoke-test the AI plan call end-to-end against BOTH providers the app uses:
// GLM (primary) and Claude (fallback). Mirrors lib/aiChat.ts. Verifies key +
// endpoint + model + that the JSON shape passes the app's parser.
// Usage: create .env (see .env.example), then:  node scripts/smoke_glm.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

try {
  for (const line of readFileSync(join(ROOT, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {
  console.error('No .env found — copy .env.example to .env and add your key(s).');
  process.exit(1);
}

const SYSTEM =
  'You are Ovara, a PCOS wellness companion. Return ONLY valid JSON, no markdown. ' +
  'Build meals from the provided PCOS-scored foods. Respect the diet preference.';
const USER = `Create a one-day plan.
Diet: Vegetarian. Fitness: Moderate. Phase: Follicular (day 8).
PCOS health score: 62/100 (Good). Weakest: metabolic 50, hormonal 55.
Foods: Soybeans roasted [PCOS 87], Almonds raw [85], Flaxseed [85], Edamame [70], Raspberries [62], Avocado [66], Wheat germ [75], Eggs [55], Mozzarella low sodium [54].
Return JSON: {"dietInsight":"...","meals":[{"id":"breakfast","label":"Breakfast","title":"...","note":"...","emoji":"🍓"},{"id":"lunch","label":"Lunch","title":"...","note":"...","emoji":"🥗"},{"id":"snack","label":"Snack","title":"...","note":"...","emoji":"🌰"},{"id":"dinner","label":"Dinner","title":"...","note":"...","emoji":"🍲"}],"workoutInsight":"...","workout":{"title":"...","duration":"20 min","intensity":"Moderate","note":"...","emoji":"🧘🏻‍♀️"},"workoutTips":[{"emoji":"🌿","title":"...","body":"..."}]}`;

function validate(content) {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = fenced?.[1] ?? content.slice(content.indexOf('{'), content.lastIndexOf('}') + 1);
  const parsed = JSON.parse(jsonStr);
  const meals = Array.isArray(parsed.meals) ? parsed.meals.length : 0;
  const okWorkout = Boolean(parsed.workout?.title);
  return { meals, workout: parsed.workout?.title, tips: parsed.workoutTips?.length ?? 0, ok: meals >= 3 && okWorkout, sample: parsed.meals?.[0] };
}

async function testGlm() {
  const key = process.env.EXPO_PUBLIC_GLM_API_KEY?.trim();
  if (!key) return { name: 'GLM', skipped: true };
  const base = (process.env.EXPO_PUBLIC_GLM_BASE_URL ?? 'https://api.z.ai/api/coding/paas/v4').replace(/\/$/, '');
  const model = process.env.EXPO_PUBLIC_GLM_MODEL ?? 'GLM-5.1';
  const t0 = Date.now();
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, temperature: 0.5, max_tokens: 1200, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: USER }] }),
  });
  const ms = Date.now() - t0;
  if (!res.ok) return { name: 'GLM', model, http: res.status, ms, error: (await res.text()).slice(0, 200) };
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? '';
  return { name: 'GLM', model, http: res.status, ms, ...validate(content) };
}

async function testClaude() {
  const key = process.env.EXPO_PUBLIC_CLAUDE_API_KEY?.trim();
  if (!key) return { name: 'Claude', skipped: true };
  const base = (process.env.EXPO_PUBLIC_CLAUDE_BASE_URL ?? 'https://api.anthropic.com').replace(/\/$/, '');
  const model = process.env.EXPO_PUBLIC_CLAUDE_MODEL ?? 'claude-opus-4-8';
  const t0 = Date.now();
  const res = await fetch(`${base}/v1/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model, max_tokens: 1500, system: SYSTEM, messages: [{ role: 'user', content: USER }] }),
  });
  const ms = Date.now() - t0;
  if (!res.ok) return { name: 'Claude', model, http: res.status, ms, error: (await res.text()).slice(0, 200) };
  const data = await res.json();
  const content = (data.content ?? []).filter((b) => b.type === 'text').map((b) => b.text ?? '').join('');
  return { name: 'Claude', model, http: res.status, ms, ...validate(content) };
}

const results = [await testGlm(), await testClaude()];
let anyOk = false;
for (const r of results) {
  if (r.skipped) { console.log(`— ${r.name}: no key set, skipped`); continue; }
  if (r.error) { console.log(`✗ ${r.name} (${r.model}): HTTP ${r.http} in ${r.ms}ms — ${r.error}`); continue; }
  console.log(`${r.ok ? '✅' : '❌'} ${r.name} (${r.model}): HTTP ${r.http} in ${r.ms}ms — meals=${r.meals}, workout="${r.workout}", tips=${r.tips}`);
  if (r.sample) console.log(`     e.g. ${r.sample.title} — ${r.sample.note}`);
  anyOk ||= r.ok;
}
console.log(anyOk ? '\n✅ PASS — at least one provider returns a usable plan.' : '\n❌ FAIL — no provider produced a valid plan.');
process.exit(anyOk ? 0 : 1);
