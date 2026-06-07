# CycleSignal AI — Backend Proxy

The production backend for the [CycleSignal](../cyclesignal) mobile app. It holds
**every** third-party API key server-side — the mobile client never sees one
(PRD `constraints #7/#8`). The app talks to this service over HTTP and **degrades
gracefully**: any route whose provider key is missing returns `503`, and the
client falls back to its on-device path, so the 60-second demo always runs.

## Run

```bash
npm install
cp .env.example .env     # fill in only the providers you have keys for
npm run dev              # tsx watch on :8787  (PORT to override)
# production:
npm run build && npm start
```

Then point the app at it via `cyclesignal/.env`:

```
EXPO_PUBLIC_API_BASE_URL=http://<your-LAN-ip>:8787
```

## Endpoints

| Method · Path     | Provider (PRD §)            | Purpose                                                            |
|-------------------|-----------------------------|-------------------------------------------------------------------|
| `GET  /health`    | —                           | Liveness + which providers are configured (the client capability probe) |
| `POST /hume/token`| Hume EVI 3 (5.1)            | Mints a short-lived EVI access token via OAuth2 client-credentials |
| `POST /extract`   | OpenAI (5.2)                | Transcript → typed `CycleEntry` via Structured Outputs (`strict`) |
| `POST /narrative` | Google Gemini (5.3)         | Pattern flags → warm, non-diagnostic summary (server-side non-diagnostic filter) |
| `POST /safety`    | Anthropic Haiku 4.5 (5.5)   | Secondary crisis-language classifier (advisory; client RegExp stays primary) |
| `POST /tts`       | Cartesia Sonic 3 (5.4)      | Fallback TTS (mp3 bytes), only relevant if EVI audio is unavailable |

Each provider route returns `503 {error:"<provider>_not_configured"}` when its key
is absent. `/health` reports the live set so the client only attempts what's available.

## Real model IDs

The PRD names not-yet-public future models; the env defaults map them to the real
current equivalents (all override-able):

| PRD name        | Env default (`.env.example`)      |
|-----------------|-----------------------------------|
| GPT-5.4 Mini    | `gpt-4o-mini`                     |
| Gemini 3.1 Flash| `gemini-2.5-flash`               |
| Claude Haiku 4.5| `claude-haiku-4-5`               |
| Cartesia Sonic 3| `sonic-3`                        |

## Architecture notes

- **Keys never leave the server.** Only `EXPO_PUBLIC_API_BASE_URL` is shipped to
  the device. SDK clients are constructed lazily (`src/clients.ts`) — only when a
  key is present.
- **Non-diagnostic guarantee.** `/narrative` runs a hard post-filter
  (`src/lib/diagnostic.ts`); diagnostic phrasing → `422`, and the client uses its
  guaranteed-safe on-device narrative instead.
- **Safety floor stays on the device.** `/safety` is the *secondary* layer only;
  the deterministic RegExp in the app (`src/lib/safety.ts`) is the non-negotiable
  primary and runs with no network dependency.
- **Live EVI audio** needs a native module + custom dev build (not Expo Go); the
  token endpoint here is protocol-correct and the client gates audio behind a
  capability check, falling back to the scripted conversation.
```
