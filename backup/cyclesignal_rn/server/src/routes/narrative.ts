import { Router } from 'express';
import { z } from 'zod';
import { env, configured } from '../env.js';
import { gemini } from '../clients.js';
import { isNonDiagnostic } from '../lib/diagnostic.js';

// Pattern Narrative — PRD Section 5.3. Deterministic pattern flags -> warm,
// non-diagnostic 2-3 sentence summary via Gemini 3.1 Flash (real: gemini-2.5-flash).
// A hard post-filter rejects any diagnostic phrasing (Constraint #1); on rejection
// or missing key we 422/503 and the client uses its safe on-device narrative.

export const narrativeRouter = Router();

const flagsSchema = z
  .object({
    cyclesTracked: z.number(),
    premenstrualMoodClustering: z.boolean().optional(),
    premenstrualMoodCycles: z.number().optional(),
    premenstrualWindowLabel: z.string().optional(),
    irregularCycles: z.boolean().optional(),
    cycleLengthRange: z.string().optional(),
    repeatedFunctionalImpact: z.boolean().optional(),
    functionalImpactCycles: z.number().optional(),
  })
  .passthrough();

const NARRATIVE_SYSTEM = `You are a supportive health information assistant. Based on cycle pattern data, write a warm, factual 2-3 sentence plain-language summary for the user.

Rules:
- Never say "you have PCOS", "you have PMDD", or any diagnostic phrase.
- Use phrasing like "this pattern may be worth discussing with a clinician."
- Be warm and factual. Do not be alarmist.
- Do not recommend any treatment, medication, or lifestyle change.
- Output only the summary text, no preamble.`;

narrativeRouter.post('/', async (req, res) => {
  if (!configured.gemini) {
    return res.status(503).json({ error: 'gemini_not_configured' });
  }
  const parsed = flagsSchema.safeParse(req.body?.flags);
  if (!parsed.success) {
    return res.status(400).json({ error: 'bad_request', detail: parsed.error.flatten() });
  }
  const flags = parsed.data;
  try {
    const result = await gemini().models.generateContent({
      model: env.gemini.narrativeModel,
      contents: `Pattern data:\n${JSON.stringify(flags)}`,
      config: {
        systemInstruction: NARRATIVE_SYSTEM,
        temperature: 0.4,
        maxOutputTokens: 300,
        // gemini-2.5-* reserve part of the output budget for internal "thinking",
        // which can swallow a small maxOutputTokens and return empty text. This is
        // a short, deterministic summary that needs no reasoning, and the PRD picks
        // Flash for speed (5.3) — so disable thinking outright.
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    const narrative = (result.text ?? '').trim();
    if (!narrative) return res.status(502).json({ error: 'gemini_empty_response' });
    if (!isNonDiagnostic(narrative)) {
      // PRD 5.3 fallback path — reject and let the client use its safe local copy.
      return res.status(422).json({ error: 'diagnostic_language_detected' });
    }
    return res.json({ narrative, model: env.gemini.narrativeModel });
  } catch (err) {
    return res.status(502).json({ error: 'narrative_failed', detail: String(err) });
  }
});
