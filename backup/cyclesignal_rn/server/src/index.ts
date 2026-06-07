import express from 'express';
import cors from 'cors';
import { env, configured } from './env.js';
import { humeRouter } from './routes/hume.js';
import { extractRouter } from './routes/extract.js';
import { narrativeRouter } from './routes/narrative.js';
import { safetyRouter } from './routes/safety.js';
import { ttsRouter } from './routes/tts.js';

// CycleSignal AI backend proxy (PRD Section 5). Holds every third-party key
// server-side; the mobile client talks to it over HTTP and degrades gracefully
// to its on-device path whenever a provider is unconfigured (each route 503s).

const app = express();

// CORS: explicit comma-separated allowlist, or open in dev (no origin set).
const origins = env.corsOrigin
  ? env.corsOrigin.split(',').map((s) => s.trim()).filter(Boolean)
  : null;
app.use(cors(origins ? { origin: origins } : {}));
app.use(express.json({ limit: '256kb' }));

// /health tells the client which features can run live vs. fall back on-device.
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'cyclesignal-server',
    configured,
    models: {
      extraction: env.openai.extractionModel,
      narrative: env.gemini.narrativeModel,
      safety: env.anthropic.safetyModel,
      tts: env.cartesia.ttsModel,
    },
  });
});

app.use('/hume', humeRouter);
app.use('/extract', extractRouter);
app.use('/narrative', narrativeRouter);
app.use('/safety', safetyRouter);
app.use('/tts', ttsRouter);

app.use((_req, res) => res.status(404).json({ error: 'not_found' }));

// Last-resort error handler so a thrown route never crashes the process.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({ error: 'internal_error', detail: String(err) });
});

app.listen(env.port, () => {
  const ready = Object.entries(configured)
    .filter(([, v]) => v)
    .map(([k]) => k);
  console.log(`CycleSignal server listening on :${env.port}`);
  console.log(`Live providers: ${ready.length ? ready.join(', ') : 'none (all on-device fallback)'}`);
});
