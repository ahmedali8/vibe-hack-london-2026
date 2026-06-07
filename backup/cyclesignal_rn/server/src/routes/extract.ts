import { Router } from 'express';
import { env, configured } from '../env.js';
import { openai } from '../clients.js';
import {
  EXTRACTION_SYSTEM,
  assembleCycleEntry,
  extractRequestSchema,
  extractionJsonSchema,
  extractionSchema,
} from '../lib/cycleEntry.js';

// Symptom Extraction — PRD Section 5.2. Transcript -> typed CycleEntry via OpenAI
// Structured Outputs (strict). Returns the full CycleEntry the client persists.
// 503 when no key, so the client falls back to its on-device extractor.

export const extractRouter = Router();

extractRouter.post('/', async (req, res) => {
  if (!configured.openai) {
    return res.status(503).json({ error: 'openai_not_configured' });
  }
  const parsed = extractRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'bad_request', detail: parsed.error.flatten() });
  }
  const ctx = parsed.data;
  try {
    const completion = await openai().chat.completions.create({
      model: env.openai.extractionModel,
      temperature: 0,
      messages: [
        { role: 'system', content: EXTRACTION_SYSTEM },
        { role: 'user', content: ctx.transcript },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'cycle_entry', strict: true, schema: extractionJsonSchema },
      },
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) return res.status(502).json({ error: 'openai_empty_response' });
    const fields = extractionSchema.parse(JSON.parse(raw));
    const entry = assembleCycleEntry(fields, ctx);
    return res.json({ entry, model: env.openai.extractionModel });
  } catch (err) {
    return res.status(502).json({ error: 'extraction_failed', detail: String(err) });
  }
});
