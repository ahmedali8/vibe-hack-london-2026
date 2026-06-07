import { Router } from 'express';
import { env, configured } from '../env.js';

// Hume AI EVI 3 access-token endpoint — PRD Section 5.1 / Constraint #7.
// The Hume API key + secret NEVER reach the device. The client opens the EVI
// WebSocket with a short-lived access token minted here via OAuth2
// client-credentials. Mirrors HumeAI/hume-api-examples token pattern.

export const humeRouter = Router();

humeRouter.post('/token', async (_req, res) => {
  if (!configured.hume) {
    return res.status(503).json({ error: 'hume_not_configured' });
  }
  try {
    const basic = Buffer.from(`${env.hume.apiKey}:${env.hume.secretKey}`).toString('base64');
    const resp = await fetch('https://api.hume.ai/oauth2-cc/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!resp.ok) {
      const detail = await resp.text();
      return res.status(502).json({ error: 'hume_token_failed', detail });
    }
    const data = (await resp.json()) as { access_token: string; expires_in?: number };
    return res.json({
      accessToken: data.access_token,
      expiresIn: data.expires_in ?? 1800,
      configId: env.hume.configId || null,
    });
  } catch (err) {
    return res.status(502).json({ error: 'hume_token_error', detail: String(err) });
  }
});
