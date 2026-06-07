# CycleSignal AI — Flutter

A **mobile-first Flutter** build of CycleSignal AI (`../PRD.md`) — a privacy-first,
voice-first tool that turns scattered PCOS/PMDD symptoms into a GP-ready evidence pack.

This build differs from the React Native one in two ways the user asked for:

1. **Real third-party integrations** (not on-device stand-ins) — Hume EVI 3 voice, OpenAI
   extraction, Gemini narrative, and the Anthropic safety classifier are wired to their
   live APIs. Only the **data** is synthetic (Amara's 6 cycles).
2. **Light theme** throughout (the PRD's dark palette re-cast onto warm light surfaces,
   keeping the rose/violet identity).

## Live AI layers (PRD Section 5)

| Layer | PRD model | How it's wired | Source |
|---|---|---|---|
| Voice conversation | **Hume AI EVI 3** | `record` mic → PCM16 over the EVI chat **WebSocket** → `audioplayers` playback; transcripts + `models.prosody.scores` emotion + `store_symptom_entry` tool call | `services/hume_voice_service.dart` |
| Symptom extraction | **GPT-5.4 Mini** | OpenAI chat completions with strict `json_schema` structured output (raw HTTP) | `services/extraction_service.dart` |
| Pattern narrative | **Gemini 3.1 Flash** | Gemini REST `generateContent` (raw HTTP) + non-diagnostic filter | `services/narrative_service.dart` |
| Safety — primary | **Hard-coded RegExp** | deterministic, synchronous, runs before any AI | `services/safety_service.dart` |
| Safety — secondary | **Claude Haiku 4.5** | Anthropic Messages API (raw HTTP — no official Dart SDK) | `services/safety_service.dart` |
| Storage / PDF / charts | local-only | `shared_preferences`, `pdf`+`printing`, custom heatmap | — |

Every layer **degrades gracefully**: if a key is absent (or a call fails/times out), it
falls back to a deterministic on-device path so the app still runs end-to-end. The voice
screen falls back to the PRD's scripted check-in when Hume isn't configured — and even
then the **real safety regex and real extraction** run.

## Run it

```bash
flutter pub get

# Works immediately with synthetic data + on-device fallbacks:
flutter run

# Full live integrations — supply keys via --dart-define (never hard-coded):
flutter run \
  --dart-define=HUME_API_KEY=... \
  --dart-define=HUME_CONFIG_ID=...           # your EVI 3 config (system prompt + store_symptom_entry tool) \
  --dart-define=OPENAI_API_KEY=... \
  --dart-define=GEMINI_API_KEY=... \
  --dart-define=ANTHROPIC_API_KEY=...
```

**Security (PRD Constraints #7/#8):** API keys must not ship in a client. The direct-key
defines above are a dev convenience. For production, stand up a tiny backend that returns a
short-lived Hume access token and set `--dart-define=HUME_TOKEN_ENDPOINT=https://.../hume-token`
(the app prefers it over the raw key), and proxy the OpenAI/Gemini/Anthropic calls server-side.

## Verified

- `flutter analyze` → **No issues found!** (whole project)
- `flutter test` → pattern rules fire all 5 signals on synthetic data; safety regex passes
- `flutter build web` → **compiles cleanly** (dart2js + Wasm dry-run)
- ⚠️ Android device build needs **Android SDK 36** (this machine has 34): `sdkmanager "platforms;android-36"`. iOS needs a Mac/Xcode. The live voice path additionally needs a real device mic + the keys above; that path was not run here.

## Source layout

```
lib/
  theme/app_theme.dart          light palette + DM Serif/DM Sans (PRD 0.2/0.3)
  services/config.dart          API keys via --dart-define
  models/                       CycleEntry + Pattern (PRD 9 / 6.3) with JSON
  logic/                        cycle/heatmap, deterministic patterns, phase, gp_data, conversation
  data/synthetic_data.dart      Amara's 6 cycles (PRD 8)
  services/                     storage, safety, narrative, extraction, hume_voice (the integrations)
  state/app_state.dart          ChangeNotifier — storage + derived patterns/narrative
  widgets/                      heatmap, pattern card, listening ring, safety sheet, top bar, ...
  screens/                      consent, dashboard, timeline, checkin, gp_pack, privacy, root_shell
  pdf/gp_pack_pdf.dart          on-device GP pack (pdf + printing)
  main.dart                     MaterialApp (light) + provider + consent gate
```

> Not a diagnostic tool. Not a medical device. Not a substitute for professional care.
