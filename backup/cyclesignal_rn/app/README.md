# CycleSignal AI — React Native (Expo)

A privacy-first **mobile app** that turns scattered cycle symptoms into a GP-ready evidence
pack — fully on-device. Built from `PRD.md` (CycleSignal AI v3.2), which was written as a web
spec and **translated here into a mobile-first React Native stack**.

## Run it

```bash
npm install
npx expo start         # press i (iOS), a (Android), or scan the QR in Expo Go
```

No API keys, no backend, no network required — everything runs locally on the device.

### Optional: production backend (live AI integrations)

The app is wired to a real backend proxy ([`../server`](../server)) that holds every
third-party key server-side (PRD #7/#8). Set `EXPO_PUBLIC_API_BASE_URL` (see
`.env.example`) and the app will use the live integrations — Hume EVI 3 token,
OpenAI extraction, Gemini narrative, Anthropic Haiku safety classifier — **with
automatic on-device fallback** whenever the server or a provider key is absent.
Leave it unset to run fully offline. Either way the UI is identical.

## Demo flow (≈60s)

1. First launch → **consent screen** (checkbox unticked by default; Continue disabled until ticked).
2. **Today** → hero shows cycle day 24, AI Pattern Insight, and the 6-cycle heatmap.
3. Tap the centre **mic** → scripted EVI-style voice check-in plays out, then saves a new entry.
4. **Timeline** → heatmap updates; tap any cell for details; per-entry history with delete.
5. **GP Pack** → toggle sections, edit the patient statement, **Download GP Pack** (real PDF via
   the OS share sheet).
6. **Privacy** → "Delete all data" / "Withdraw consent" in one tap.
7. **Safety**: in a check-in, type a crisis phrase (e.g. "I want to die") → the hard-coded safety
   card appears instantly and the conversation stops. Nothing is stored.

## Web spec → mobile stack

The PRD targets the web; these layers were mapped to their mobile equivalents while keeping every
non-negotiable constraint (Section 11) intact:

| PRD (web) | This app (React Native) |
|---|---|
| Dexie.js + IndexedDB | **AsyncStorage** (`src/lib/storage.ts`) — local-only, no server |
| Apache ECharts heatmap | **Custom RN heatmap** (`src/components/Heatmap.tsx`) per the 0.7 spec |
| @react-pdf/renderer | **expo-print** HTML→PDF + expo-sharing (`src/pdf/gpPackHtml.ts`) |
| Hume AI EVI 3 voice | **Backend EVI token** (`/hume/token`) + scripted conversation fallback (`src/lib/conversation.ts`) — no audio ever stored |
| GPT-5.4 Mini extraction | **Backend `/extract`** (OpenAI) → on-device extractor fallback (`src/lib/extraction.ts`) |
| Gemini 3.1 Flash narrative | **Backend `/narrative`** (Gemini) → on-device narrative fallback, both non-diagnostic-guarded (`src/lib/narrative.ts`) |
| Hard-coded RegExp safety | **Identical RegExp primary** (`src/lib/safety.ts`) + async Anthropic Haiku secondary (`/safety`) |
| React 19 + Tailwind | **React Native + Expo** with the 0.2/0.3 design tokens (`src/theme/`) |

Every AI layer calls the backend proxy ([`../server`](../server)) when `EXPO_PUBLIC_API_BASE_URL`
is set, and transparently falls back to an isolated on-device module otherwise (`src/lib/api.ts`
mediates this). So the demo works with zero keys and zero data leaving the phone, while a full
production deployment uses the real Hume / OpenAI / Gemini / Anthropic stack — without any UI change.

## What's implemented (PRD §6)

- **Feature 1** — Voice check-in: animated listening ring, live transcript, emotion pill, turn
  counter, end-confirmation, full-screen takeover.
- **Feature 2** — Cycle heatmap: 6 cycles × cycle days, dominant-symptom colours, premenstrual
  overlay, irregular-row highlighting, tap tooltips, horizontal scroll.
- **Feature 3** — AI Pattern Insight: deterministic rules (irregular / premenstrual clustering /
  functional impact / PCOS / PMDD) + warm non-diagnostic narrative.
- **Feature 4** — GP Evidence Pack: section toggles, editable statement, embedded heatmap,
  always-on disclaimer, real PDF export.
- **Feature 5** — Safety: deterministic RegExp + emotion threshold, exact crisis copy & numbers.
- **Feature 6** — Privacy: data summary, delete entry / cycle / all, withdraw consent, consent gate.

Demo data is Amara's 6 synthetic cycles (`src/data/syntheticData.ts`).

## Source layout

```
src/
  theme/        colours + typography tokens (PRD §0)
  types/        CycleEntry + pattern types (PRD §9)
  data/         synthetic Amara dataset (PRD §8)
  lib/          storage, safety, patterns, narrative, extraction, cycle/phase helpers, gpData
  context/      AppContext — state, persistence, derived patterns
  components/    Heatmap, PatternInsightCard, ListeningRing, SafetyCard, TopBar, Card, Button, …
  navigation/   bottom tabs + elevated mic + root stack
  screens/      Dashboard, Timeline, CheckIn, GPPack, Privacy, Consent
  pdf/          GP pack HTML template for expo-print
```

> Not a diagnostic tool. Not a medical device. Not a substitute for professional care.
