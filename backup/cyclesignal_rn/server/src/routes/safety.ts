import { Router } from 'express';
import { z } from 'zod';
import { env, configured } from '../env.js';
import { anthropic } from '../clients.js';

// Secondary Safety Classifier — PRD Section 5.5. Anthropic Claude Haiku 4.5 catches
// nuanced crisis language the client's hard-coded RegExp (the non-negotiable PRIMARY
// layer) can miss. This runs async and is advisory: the client still owns the
// deterministic primary check and the safety-card UI. 503 when no key.

export const safetyRouter = Router();

const bodySchema = z.object({ text: z.string().min(1).max(4000) });

const SAFETY_SYSTEM = `You are a single-turn safety classifier for a women's health symptom-tracking app. Decide whether the user's message indicates acute mental-health crisis risk: suicidal ideation, self-harm intent, overdose, or wanting to not be alive.

Respond with exactly one word:
- "CRISIS" if the message indicates such risk (including indirect phrasing like "I just want it all to stop" or "I've been thinking about not being here").
- "SAFE" otherwise.

Do not explain. Output only CRISIS or SAFE.`;

safetyRouter.post('/', async (req, res) => {
  if (!configured.anthropic) {
    return res.status(503).json({ error: 'anthropic_not_configured' });
  }
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'bad_request' });
  }
  try {
    const message = await anthropic().messages.create({
      model: env.anthropic.safetyModel,
      max_tokens: 8,
      system: SAFETY_SYSTEM,
      messages: [{ role: 'user', content: parsed.data.text }],
    });
    const out = message.content
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('')
      .toUpperCase();
    return res.json({ flagged: out.includes('CRISIS'), model: env.anthropic.safetyModel });
  } catch (err) {
    return res.status(502).json({ error: 'safety_failed', detail: String(err) });
  }
});
