# CycleSignal AI — Product Requirements Document v3.2

**Version:** 3.2 (Definitive Per-Task Model Stack, June 2026)
**Date:** June 2026
**Context:** VibeHack London — Prevention & Early Intervention in UK Women's Health (PCOS / PMDD)
**Status:** Hackathon MVP — Definitive Build Specification
**Supersedes:** PRD v3.1 (June 2026)

---

## What Changed in v3.2

Every AI layer has been replaced or confirmed with the **optimal model for its specific task**, balancing accuracy, speed, and cost. GPT-4o has been fully retired. The stack now routes each task to the model that is measurably best at it, rather than defaulting to a single general-purpose model.

| Layer | PRD v3.1 | PRD v3.2 | Rationale |
|---|---|---|---|
| Voice conversation | Hume AI EVI 3 | **Hume AI EVI 3** (confirmed) | Unique emotion-from-prosody capability; HIPAA; <300ms; React SDK |
| Symptom extraction | GPT-4o (2024-08-06) | **GPT-5.4 Mini** | <200ms TTFB; $0.0015/call; near-frontier structured output reliability |
| Pattern narrative | GPT-4o (2024-08-06) | **Gemini 3.1 Flash** | ~0.63s; $0.000525/call; best speed/cost for warm non-diagnostic prose |
| TTS (fallback only) | ElevenLabs (removed) | **Cartesia Sonic 3** | 40–90ms TTFA; emotion tags; HIPAA; only needed if EVI 3 is not used |
| Safety — primary | Hard-coded RegExp | **Hard-coded RegExp** (confirmed) | Deterministic; <1ms; client-side; cannot be overridden |
| Safety — secondary | None | **Anthropic Safety Classifiers (Claude Haiku 4.5)** | 99.3% single-turn accuracy; async; HIPAA; catches nuanced crisis language |
| Local storage | Dexie.js + IndexedDB | **Dexie.js + IndexedDB** (confirmed) | Privacy-first; no server; all data on device |
| PDF generation | @react-pdf/renderer | **@react-pdf/renderer** (confirmed) | Declarative JSX; client-side; no server round-trip |
| Charts in PDF | Apache ECharts | **Apache ECharts** (confirmed) | SVG output; embeds cleanly in react-pdf |

## What Changed in v3.1

Added **Section 0: UI Design Language** — a complete visual specification inspired by the design quality of Flow (by Robyn) and Stardust. This section defines the colour palette, typography, layout paradigm, component specifications, and animation principles that must be followed during the build.

## What Changed in v3.0

PRD v2.0 used the OpenAI Realtime API as the voice conversation layer and jsPDF + jspdf-autotable for the GP pack. Both have been replaced with the best-available technology as of June 2026. The full stack upgrade rationale is in Section 5.

| Layer | PRD v2.0 | PRD v3.0 | Reason for change |
|---|---|---|---|
| Voice conversation | OpenAI Realtime API (GPT-4o) | **Hume AI EVI 3** | Empathic voice AI with real-time emotion detection; sub-300ms latency; HIPAA-compliant; designed for emotionally sensitive conversations |
| Voice output (TTS) | ElevenLabs Flash v2.5 | **ElevenLabs Flash v2.5** (unchanged) | Still the best balance of ~75ms TTFB, HIPAA Zero Retention Mode, and naturalness |
| Symptom extraction | GPT-4o Structured Outputs | **GPT-4o (2024-08-06) Structured Outputs** (unchanged) | 100% reliability with `strict: true`; remains the best for schema-enforced health data extraction |
| GP pack PDF | jsPDF + jspdf-autotable | **@react-pdf/renderer** | Native React API, declarative layout, SVG chart embedding, better GP-ready formatting |
| Cycle timeline chart | Recharts | **Apache ECharts** (via echarts-for-react) | Native heatmap component, SVG output embeddable in PDF, better for cycle-day matrix visualisation |
| Memory / storage | Dexie.js + IndexedDB | **Dexie.js + IndexedDB** (unchanged) | Maximum privacy; all data stays on device; still the best approach for a privacy-first health app |
| Backend requirement | Express proxy for OpenAI token | **Hume AI access token endpoint** | Hume AI also requires a short-lived access token; same minimal backend pattern |
---

## 0. UI Design Language

CycleSignal AI draws its visual identity from two reference points: **Stardust** (deep cosmic dark theme, moon-phase iconography, intimate and mystical) and **Flow by Robyn** (soft blush and rose tones, large cycle-day hero element, warm and approachable). The synthesis is a design that feels **clinically credible but emotionally warm** — dark enough to feel private and serious, with rose and violet accents that feel human rather than medical.

This section is the binding design contract for the build. Every component, colour, and animation decision must be checked against it.

---

### 0.1 Design Philosophy

The app must feel like a trusted private journal, not a medical dashboard. The user is sharing something vulnerable. The design must communicate: *this is a safe space, your data is yours, and something intelligent is listening*.

Three principles govern every visual decision:

1. **Dark intimacy.** A deep near-black background (not pure black — slightly warm, like midnight indigo) creates a sense of privacy. The user is not filling in a form under fluorescent lights; they are confiding in something that holds their information carefully.
2. **Rose warmth.** Accent colours drawn from the rose-to-crimson spectrum (as used in both Flow and Stardust) signal that this is a women's health space without being infantilising. Rose is used for active states, CTAs, and symptom severity. It is never used for error states (those use amber).
3. **Cosmic precision.** Borrowed from Stardust: subtle star-field texture in the background, moon-phase glyphs as cycle-day markers, and a sense of orbital rhythm in the cycle timeline. This is not decorative — it reinforces that cycles are natural, recurring, and worth tracking with care.

---

### 0.2 Colour Palette

| Token | Hex | Usage |
|---|---|---|
| `--bg-base` | `#0D0B1A` | Page background — deep midnight indigo, not pure black |
| `--bg-surface` | `#16132B` | Card and panel backgrounds |
| `--bg-elevated` | `#1E1A35` | Modals, tooltips, hover states |
| `--border-subtle` | `#2D2850` | Card borders, dividers |
| `--text-primary` | `#F0EDF8` | Primary body text — warm off-white, not pure white |
| `--text-secondary` | `#9B93C4` | Secondary labels, metadata, timestamps |
| `--text-muted` | `#5C5480` | Placeholder text, disabled states |
| `--accent-rose` | `#E11D48` | Primary CTA, active states, high-severity symptoms |
| `--accent-rose-soft` | `#FDA4AF` | Low-severity mood indicators, soft highlights |
| `--accent-rose-glow` | `rgba(225,29,72,0.15)` | Glow behind the mic button, active conversation ring |
| `--accent-violet` | `#7C3AED` | Secondary accent — AI pattern insight card, gradient midpoint |
| `--accent-violet-soft` | `#A78BFA` | AI-generated text labels, EVI emotion indicator |
| `--accent-amber` | `#F59E0B` | Irregular cycle warnings, physical symptom cells |
| `--accent-blue` | `#3B82F6` | Bleeding day cells in heatmap |
| `--safety-red` | `#DC2626` | Safety card background tint only |
| `--gradient-hero` | `linear-gradient(135deg, #1E1A35 0%, #2D1B4E 50%, #1A0E2E 100%)` | Dashboard hero section background |
| `--gradient-cta` | `linear-gradient(135deg, #E11D48 0%, #7C3AED 100%)` | Primary CTA button gradient |

---

### 0.3 Typography

Two typefaces only. No Inter.

| Role | Typeface | Weight | Usage |
|---|---|---|---|
| Display / hero | **DM Serif Display** | 400 (italic available) | Cycle day number, section headings, pattern insight headline |
| Body / UI | **DM Sans** | 300, 400, 500, 600 | All body text, labels, buttons, metadata |

**Type scale:**

| Token | Size | Weight | Line height | Usage |
|---|---|---|---|---|
| `--text-hero` | 56px | DM Serif 400 | 1.0 | Cycle day number on dashboard hero |
| `--text-display` | 32px | DM Serif 400 | 1.1 | Section headings, GP pack title |
| `--text-title` | 20px | DM Sans 600 | 1.2 | Card headings, screen titles |
| `--text-body` | 15px | DM Sans 400 | 1.6 | Body copy, conversation transcript |
| `--text-label` | 13px | DM Sans 500 | 1.4 | Form labels, metadata, cycle day labels |
| `--text-caption` | 11px | DM Sans 400 | 1.4 | Timestamps, privacy notices, disclaimers |

---

### 0.4 Iconography and Cycle Glyphs

Borrowed directly from Stardust's visual language: **moon phases as cycle-day markers**. Each day in the cycle timeline header uses a moon-phase glyph (new moon through waxing and waning phases back to new moon). The current day is highlighted with a glowing ring in `--accent-rose`.

For symptom type icons, use a minimal line-icon set (Lucide or Phosphor) at 20px. Icons are never filled — always stroke-only at 1.5px weight, in `--text-secondary`. Active/selected state switches to `--accent-rose` stroke.

Specific icons used:

| Symptom | Icon name |
|---|---|
| Mood low | `cloud-rain` |
| Mood anxious | `wind` |
| Pain | `zap` |
| Fatigue | `battery-low` |
| Acne | `circle-dot` |
| Hair growth | `feather` |
| Bloating | `circle` |
| Bleeding | Custom teardrop SVG (as in Stardust) in `--accent-rose` |
| Missed work | `calendar-x` |
| Privacy lock | `lock` |
| Safety | `shield-alert` |

---

### 0.5 Layout Paradigm

The layout is **asymmetric with a dominant hero zone** — borrowed from Flow's large cycle-day circle. The dashboard is not a grid of equal cards. It has:

1. **Hero zone** (top ~40% of viewport): A large radial element showing the current cycle day, phase label, and the "Talk to CycleSignal" CTA. Background is the `--gradient-hero`. The cycle day number is rendered in `--text-hero` DM Serif. A subtle animated particle field (CSS-only, 12 small white dots at varying opacity and drift speed) fills the hero background — referencing Stardust's star field.

2. **Content zone** (bottom ~60%): Cards on `--bg-surface` with 16px radius and `--border-subtle` border. No drop shadows — separation is achieved through background colour difference only. Cards are full-width on mobile, two-column on desktop at 1024px and above.

3. **Persistent top bar**: 56px height, `--bg-base` background, no border. Left: CycleSignal wordmark in DM Serif 20px `--text-primary`. Right: privacy lock icon and settings icon. The top bar is always visible and never scrolls away.

4. **Bottom navigation** (mobile): Tab bar with 5 items — Today, Timeline, Check-In (centre, elevated rose CTA), GP Pack, Privacy. The Check-In tab is a 56px rose circle with a mic icon, elevated 8px above the tab bar — identical to the prominent centre action in Stardust and Flow.

---

### 0.6 The Voice Conversation Interface

This is the most important screen. It must feel like a private, intimate space — not a chatbot window.

**Full-screen takeover** when the check-in starts. The background transitions from `--bg-base` to a deep radial gradient (`radial-gradient(ellipse at center, #2D1B4E 0%, #0D0B1A 70%)`) — like entering a dark room.

**Animated listening ring**: A 160px circle centred on screen. At rest: a single rose ring at 50% opacity, pulsing slowly (scale 1.0 to 1.05, 2s ease-in-out, infinite). When the user is speaking: the ring expands and contracts based on audio amplitude (Web Audio API `AnalyserNode`), with 3 concentric rings at decreasing opacity. When the AI is speaking: the ring glows in `--accent-violet-soft` with a slower, smoother pulse.

**Transcript area**: Below the ring. AI lines appear in `--accent-violet-soft` DM Sans 15px. User lines appear in `--text-primary` DM Sans 15px. Each line fades in from opacity 0 over 200ms. Max 4 lines visible; older lines fade out upward.

**Emotion indicator**: A small pill in the top-right corner of the conversation screen. Shows the dominant emotion detected by EVI 3 prosody. States: `Calm` (green dot), `Tired` (blue dot), `Anxious` (amber dot), `Distressed` (rose dot). Fades in only when a non-neutral emotion is detected. Never shown during AI speaking turns.

**Turn counter**: Bottom-left, `--text-muted` caption: "Turn 2 of 4".

**End conversation**: A small X button top-right. Tapping it shows a confirmation: "End check-in? Your progress will be saved."

---

### 0.7 The Heatmap Timeline

The heatmap is the centrepiece of the dashboard content zone. It must be immediately readable to a judge in 5 seconds.

**Visual treatment:**

| Property | Value |
|---|---|
| Background | `--bg-surface` |
| Cell size | 14px × 14px with 2px gap |
| Cell border-radius | 3px |
| No data | `#1E1A35` |
| Severity 1–2 (mood) | `#FDA4AF` |
| Severity 3 (mood) | `#FB7185` |
| Severity 4–5 (mood) | `#E11D48` |
| Physical only (no mood) | `#F59E0B` |
| Bleeding day | `#3B82F6` |
| Premenstrual window overlay | `rgba(124,58,237,0.12)` with 1px `--accent-violet` left border |
| Irregular cycle row label | `--accent-amber` |

**Interaction:** Hover or tap on a cell shows a tooltip card with the date, cycle day, and logged symptoms as small icon-and-label pairs. The heatmap scrolls horizontally on mobile if the cycle is longer than the viewport.

---

### 0.8 The Pattern Insight Card

A full-width card below the heatmap. Left border: 3px solid rose-to-violet gradient. Background: `--bg-surface`.

- Top-left: a small sparkles icon in `--accent-violet-soft` and the label "AI Pattern Insight" in `--text-label`
- Headline: the dominant pattern label (e.g., "Premenstrual mood pattern detected") in `--text-title` DM Sans 600
- Body: the GPT-4o narrative in `--text-body` DM Sans 400, `--text-secondary` colour
- Bottom-right: "Updated just now" timestamp in `--text-caption`
- If no pattern yet: placeholder state — "Check in a few more times to see your pattern emerge." in `--text-muted` italic

---

### 0.9 The GP Evidence Pack Screen

This screen must feel like a document preview — professional and clinical, not like the rest of the app's dark theme.

**PDF preview pane**: White background (`#FFFFFF`), 8px shadow, centred in the screen with the dark app background visible around it. This contrast is intentional — it signals "this is a document for your doctor, not for the app."

**Section toggles**: To the left of the preview on desktop, or above it on mobile, a vertical list of toggle switches for each section. Toggle labels in `--text-primary` on `--bg-surface`. Active toggles use `--accent-rose`.

**Export button**: Full-width, `--gradient-cta`, DM Sans 600, "Download GP Pack" with a download icon. Below it, a caption in `--text-muted`: "Generated on your device. Nothing is sent to a server."

---

### 0.10 Animation Principles

All animations respect `prefers-reduced-motion`. When reduced motion is preferred, all transitions are instant (0ms) except fade-ins which use 100ms opacity only.

| Element | Animation | Duration | Easing |
|---|---|---|---|
| Page transitions | Fade + 8px upward slide | 200ms | `cubic-bezier(0.23, 1, 0.32, 1)` |
| Card entrance | Fade + 6px upward slide, staggered 40ms per card | 180ms | `cubic-bezier(0.23, 1, 0.32, 1)` |
| Mic button press | `scale(0.94)` | 120ms | `cubic-bezier(0.23, 1, 0.32, 1)` |
| Listening ring pulse (idle) | `scale(1.0 to 1.05)` | 2000ms | `ease-in-out`, infinite |
| Listening ring (speaking) | Amplitude-driven scale | Real-time | Web Audio API |
| Transcript line entrance | `opacity: 0 to 1`, `translateY(6px to 0)` | 200ms | `cubic-bezier(0.23, 1, 0.32, 1)` |
| Heatmap cell hover | `scale(1.0 to 1.2)`, z-index raise | 100ms | `ease-out` |
| Safety card entrance | Full-screen fade from `rgba(220,38,38,0.08)` | 300ms | `ease-out` |
| Emotion pill fade-in | `opacity: 0 to 1` | 400ms | `ease-out` |
| CTA button hover | `scale(1.02)`, glow intensifies | 150ms | `ease-out` |

---

### 0.11 Component Specifications

**Primary CTA button** ("Talk to CycleSignal", "Download GP Pack"):
- Background: `--gradient-cta` (rose to violet)
- Text: `--text-primary`, DM Sans 600, 15px
- Padding: 14px 28px
- Border-radius: 100px (fully rounded — as in Flow and Stardust)
- No border
- Active state: `scale(0.97)`, 120ms
- Disabled state: `opacity: 0.4`, flat `--bg-elevated` (no gradient)

**Secondary button** ("View History", "Edit Statement"):
- Background: transparent
- Border: 1px solid `--border-subtle`
- Text: `--text-secondary`, DM Sans 500, 14px
- Border-radius: 100px
- Hover: border becomes `--accent-violet-soft`, text becomes `--text-primary`

**Card**:
- Background: `--bg-surface`
- Border: 1px solid `--border-subtle`
- Border-radius: 16px
- Padding: 20px
- No drop shadow

**Toggle switch**:
- Track active: `--accent-rose`
- Track inactive: `--border-subtle`
- Thumb: `--text-primary`
- Transition: 150ms ease

**Safety card** (special):
- Background: `rgba(220,38,38,0.08)` tint over `--bg-surface`
- Left border: 4px solid `--safety-red`
- Icon: `shield-alert` in `--safety-red`
- All phone numbers in `--accent-rose`, tappable as `tel:` links

## 1. Problem Statement

Women with PCOS or PMDD wait an average of 7–10 years for a diagnosis in the UK. The clinical knowledge to diagnose these conditions exists. The barrier is evidence: symptoms are scattered across months, hard to recall in a 10-minute GP appointment, and routinely dismissed because the patient cannot articulate the pattern clearly.

**The gap is not awareness. It is structured, time-stamped, cycle-linked evidence that a clinician can act on.**

CycleSignal AI closes that gap by turning private, scattered symptom experiences into a GP-ready evidence pack — controlled entirely by the user.

---

## 2. Product Definition

CycleSignal AI is a web application that:

1. Conducts an AI-guided voice conversation to extract cycle-linked symptoms, using an empathic voice AI that detects and responds to the user's emotional state in real time.
2. Learns the user's personal symptom baseline over time using local vector embeddings.
3. Detects clinically relevant patterns (PCOS-consistent, PMDD-consistent) using deterministic rules.
4. Generates a GP-ready evidence pack the user controls and exports as a structured PDF.

It is **not** a period tracker, a diagnostic tool, a fertility app, or a chatbot. It is a **private pattern memory and evidence preparation system**.

---

## 3. Target User

**Primary user:** A person aged 18–45 in the UK who suspects they have PCOS or PMDD but has not been formally assessed, has been dismissed by a GP and needs structured evidence to return with, or does not know how to describe what is happening to them in a clinical setting.

**Demo user (hackathon):** A fictional synthetic user named Amara, 29, with 6 months of preloaded cycle history showing a PMDD-like premenstrual mood pattern and irregular cycles consistent with PCOS.

---

## 4. Core Principles

1. **Non-diagnostic.** The app never says "you have PCOS" or "you have PMDD." It says "this pattern may be worth discussing with a clinician."
2. **Voice-first.** The primary interaction is a spoken conversation, not a form. The AI detects emotional state and adapts its tone accordingly.
3. **Privacy-first.** Data stays local by default. The user controls every export. No data leaves the device without explicit user action.
4. **Safety-first.** Urgent mental-health language triggers an immediate hard-coded safety response — never an AI-generated one.
5. **Evidence-focused.** Every feature exists to produce better clinical evidence, not engagement metrics.

---

## 5. Technology Stack — Definitive Per-Task Model Assignments

This section supersedes all previous stack tables. Each model was selected by evaluating the specific task requirements against June 2026 benchmark data, latency measurements, cost per invocation, and HIPAA compliance status.

---

### 5.1 Voice Conversation Layer — Hume AI EVI 3

**Task:** Conduct a 4-turn empathic spoken conversation, detect emotional state from voice prosody, ask intelligent follow-up questions, and call the `store_symptom_entry` tool when sufficient data is collected.

**Why EVI 3 wins this task:** EVI 3 is the only production voice AI model that performs real-time emotion detection from vocal prosody — not from the words spoken, but from the acoustic signal itself. This is non-negotiable for CycleSignal: a user describing pain and exhaustion may choose words that understate their distress; their voice will not. EVI 3 delivers sub-300ms end-to-end latency, supports tool/function calling mid-conversation, handles barge-in interruption, and is HIPAA-compliant with SOC 2 Type II certification. The `@humeai/voice-react` SDK provides a `VoiceProvider` and `useVoice` hook for direct React integration.

| Metric | Value |
|---|---|
| End-to-end latency | <300ms |
| Emotion detection | Real-time from voice prosody (distress, sadness, fear, calmness scores per turn) |
| Tool calling | Native — `store_symptom_entry` fires mid-conversation |
| React integration | `@humeai/voice-react` — `VoiceProvider` + `useVoice` hook |
| HIPAA | Yes — explicit, SOC 2 Type II, GDPR |
| Cost | ~$0.06–$0.08/min |
| Runner-up | OpenAI Realtime API (GPT-4o Realtime) — better general reasoning, but no prosody emotion detection, higher cost (~$0.30/min), and HIPAA requires a separate BAA |

---

### 5.2 Symptom Extraction Layer — GPT-5.4 Mini

**Task:** Receive the plain-text transcript of the completed voice conversation and extract a fully typed `CycleEntry` JSON object (mood type/severity/onset, pain, acne, hair growth, fatigue, sleep, bloating, bleeding, functional impact, medications).

**Why GPT-5.4 Mini wins this task:** This is a structured output task where speed and cost matter as much as accuracy — the user is waiting for the dashboard to update. GPT-5.4 Mini delivers sub-200ms TTFB, costs $0.0015 per call (800 input + 300 output tokens), and is specifically optimised for high-throughput reliable instruction-following. It handles ambiguous natural language ("I felt a bit off, like that crash I always get") with near-frontier accuracy. Claude Opus 4.6 is marginally more accurate on edge cases but costs 7.7× more per call and has ~2.98s end-to-end latency — an unacceptable trade-off for a user-facing dashboard update.

| Model | TTFB | Cost/call | Schema reliability | Verdict |
|---|---|---|---|---|
| **GPT-5.4 Mini** | **<200ms** | **$0.0015** | High | **Winner** |
| Claude Sonnet 4.6 | ~1.05s | $0.0075 | High | Good balance, 5× more expensive |
| Gemini 3 Flash | ~2.72s | $0.0009 | Good | Cheapest, but 13× slower |
| Claude Opus 4.6 | ~2.98s | $0.0115 | Best | Overkill — use for edge-case fallback only |
| GPT-4o (2024-08-06) | ~0.42s TTFB | $0.0055 | Good | Retired — superseded by Mini at lower cost |

**Integration:** `openai` npm package — `client.chat.completions.create` with `response_format: { type: 'json_schema', json_schema: { strict: true, schema: CycleEntrySchema } }`.

**HIPAA:** Yes, with BAA via OpenAI Enterprise.

---

### 5.3 Pattern Narrative Layer — Gemini 3.1 Flash

**Task:** Receive the deterministic pattern flags object (e.g., `{ irregular_cycles: true, premenstrual_mood_clustering: true, cycles_affected: 4, cycle_length_range: '38–61 days' }`) and generate a 2–3 sentence warm, non-diagnostic, clinically grounded plain-language summary for the user dashboard.

**Why Gemini 3.1 Flash wins this task:** This task is invoked after every check-in and is shown on the dashboard — it must be fast and cheap. Gemini 3.1 Flash delivers ~0.63s end-to-end latency and costs $0.000525 per call (200 input + 150 output tokens). It is optimised for high-volume, low-latency generation tasks and produces fluent, warm prose. The non-diagnostic constraint is a simple instruction-following task that all frontier models handle reliably — the differentiator here is speed and cost, where Gemini 3.1 Flash is the clear winner.

| Model | Latency | Cost/call | Prose quality | Verdict |
|---|---|---|---|---|
| **Gemini 3.1 Flash** | **~0.63s** | **$0.000525** | Good | **Winner** |
| Gemini 3 Flash | ~0.5s | $0.00075 | Good | Marginally faster, slightly more expensive |
| GPT-5.4 Mini | <300ms | $0.000825 | Reliable but tonally inconsistent | Runner-up for speed |
| Claude Sonnet 4.6 | ~1.05s | $0.00285 | Best prose quality | Use if tone quality is the priority |
| Claude Opus 4.6 | ~2.98s | $0.00475 | Excellent | Overkill — 9× more expensive, 4.7× slower |

**Integration:** `@google/generative-ai` npm package — `genAI.getGenerativeModel({ model: 'gemini-3.1-flash' }).generateContent(prompt)`.

**HIPAA:** Yes, with BAA via Google Cloud.

**Fallback:** If Gemini 3.1 Flash produces a narrative that fails the non-diagnostic keyword check (a hard-coded post-processing filter), fall back to GPT-5.4 Mini with a stricter system prompt.

---

### 5.4 Text-to-Speech Layer — Cartesia Sonic 3 (Fallback Only)

**Task:** Provide the AI's spoken voice output during the conversation.

**Status: This layer is only active if Hume AI EVI 3 is unavailable.** EVI 3 is a speech-to-speech model — it handles both STT and TTS natively. Cartesia Sonic 3 is specified here as the fallback TTS layer in the event of EVI 3 API unavailability during the demo.

**Why Cartesia Sonic 3:** 40–90ms time-to-first-audio (the fastest among evaluated options), emotion and laughter tags for expressive output, HIPAA-compliant with BAA, and a clean streaming API. ElevenLabs Flash v2.5 is the runner-up (~75ms TTFB, also HIPAA-eligible).

| Model | TTFB | Cost | Expressiveness | HIPAA | Verdict |
|---|---|---|---|---|---|
| **Cartesia Sonic 3** | **40–90ms** | ~$0.000125/conv | Very high (emotion tags) | Yes (BAA) | **Winner** |
| ElevenLabs Flash v2.5 | ~75ms | $0.05/1K chars | High | Yes (BAA) | Runner-up |
| OpenAI TTS-1-HD | <150ms | $30/1M chars | High | Yes (BAA) | Good, higher latency |
| Google Cloud TTS Chirp 3 | Streaming | Character-based | Moderate | Yes (BAA) | Less expressive |

**Integration:** `@cartesia/sdk` — `cartesia.tts.stream({ modelId: 'sonic-3', voice: { ... }, transcript: text })`.

---

### 5.5 Safety Layer — Hard-coded RegExp (Primary) + Claude Haiku 4.5 (Secondary)

**Primary layer — Hard-coded RegExp (non-negotiable):**
A deterministic client-side RegExp pattern set runs on every transcript turn and every text input. It matches explicit crisis language (suicidal ideation, self-harm, overdose references) in under 1ms. It cannot be overridden by any AI model output. It fires synchronously before any AI processing begins. This layer is the absolute safety floor and is never removed or relaxed.

**Secondary layer — Anthropic Safety Classifiers (Claude Haiku 4.5):**
Research confirms that hard-coded RegExp alone can miss nuanced or evolving crisis language ("I just want it all to stop", "I've been thinking about not being here"). Anthropic's safety classifiers, running asynchronously on each turn, add a second detection layer with 99.3% single-turn accuracy for clear mental health risk. The async execution means it does not add to user-facing latency. Cost is approximately 25% of the Haiku 4.5 inference cost per turn — negligible at hackathon scale.

| Layer | Mechanism | Latency | Cost | False negative rate | HIPAA |
|---|---|---|---|---|---|
| **RegExp (primary)** | Client-side deterministic | <1ms | $0 | 0% on explicit language | Yes (no data transfer) |
| **Claude Haiku 4.5 (secondary)** | Async Anthropic classifier | Non-blocking | ~$0.0001/turn | <1% on single-turn clear risk | Yes (Enterprise BAA) |
| OpenAI Moderation API | API call | Up to 4s | Free | ~28% (community reports) | Enterprise BAA only |
| Perspective API | API call | ~1–1.5s | Free (sunsetting) | Unknown for health crisis | No explicit HIPAA |

**Integration:** `@anthropic-ai/sdk` — `client.messages.create` with safety classifier system prompt, called asynchronously via `Promise.race` with a 2s timeout. If the classifier returns a safety flag AND the RegExp has not already triggered, the safety card is shown.

---

### 5.6 Local Storage — Dexie.js + IndexedDB (Confirmed)

No change from PRD v3.1. All cycle data, conversation transcripts, pattern flags, and emotion snapshots are stored exclusively in the user's browser IndexedDB via Dexie.js. No server, no account, no data transmission. This is the product's primary privacy guarantee and must never be compromised.

**Schema additions in v3.2:**
- `emotionSnapshot` on `CycleEntry`: stores EVI 3 prosody scores (distress, sadness, fear, calmness) from the conversation. Used only for the secondary safety trigger and ambient UI feedback. Never included in the GP pack unless the safety check was triggered.
- `narrativeModel` on `PatternAnalysis`: records which model generated the narrative (`gemini-3.1-flash` or `gpt-5.4-mini` fallback) for debugging.

---

### 5.7 GP Evidence Pack — @react-pdf/renderer + Apache ECharts (Confirmed)

No change from PRD v3.1. The GP pack is generated entirely client-side. `@react-pdf/renderer` produces the PDF layout via declarative JSX components. Apache ECharts renders the heatmap and cycle length chart as SVG, which is embedded directly into the react-pdf document. No server round-trip. The PDF is never transmitted — it is downloaded directly from the browser.

---

### 5.8 Complete Stack Summary

| Layer | Technology | Task | Cost/invocation |
|---|---|---|---|
| Voice conversation | **Hume AI EVI 3** | Empathic 4-turn check-in + tool calling | ~$0.07/min |
| Symptom extraction | **GPT-5.4 Mini** | Transcript → CycleEntry JSON | $0.0015 |
| Pattern narrative | **Gemini 3.1 Flash** | Pattern flags → warm summary | $0.000525 |
| TTS (fallback only) | **Cartesia Sonic 3** | AI voice output if EVI 3 unavailable | $0.000125/conv |
| Safety primary | **Hard-coded RegExp** | Crisis language detection | $0 |
| Safety secondary | **Claude Haiku 4.5** | Nuanced crisis language (async) | ~$0.0001/turn |
| Local storage | **Dexie.js + IndexedDB** | All user data, privacy-first | $0 |
| PDF generation | **@react-pdf/renderer** | GP evidence pack | $0 (client-side) |
| Charts | **Apache ECharts** | Heatmap + cycle chart in PDF | $0 (client-side) |
| Frontend | **React 19 + TypeScript + Tailwind 4** | UI | — |

**Total estimated cost for a complete demo session** (1 check-in, 3-minute conversation, 1 GP pack generation): approximately **$0.22** — dominated by the EVI 3 voice conversation cost.


## 6. MVP Features

### Feature 1 — AI-Guided Voice Conversation (Check-In)

#### What it is

The user taps **"Talk to CycleSignal"**. The app fetches a short-lived Hume AI access token from the backend, then opens a WebSocket connection to EVI 3. The AI speaks first with a warm opening question based on the user's current cycle day. The user responds freely in natural speech. EVI 3 detects the user's emotional state from their voice prosody and adapts its tone in real time. The AI asks intelligent follow-up questions to extract what is clinically missing. The conversation ends when the `store_symptom_entry` tool call fires or after a maximum of 4 turns.

#### Exact conversation flow

```
[AI opens — EVI 3 voice, emotionally calibrated to neutral/warm]
"Hi Amara. You're on day 24. How are you feeling today?"

[User speaks — EVI 3 detects flat, exhausted vocal tone]
"I've been really low. I couldn't get out of bed this morning."

[EVI 3 responds with matched warmth, lower pace]
"That sounds really hard. Is this the kind of low that feels different from
 normal tiredness — more like a sudden crash?"

[User]
"Yes, exactly. It always happens around now."

[EVI 3 follow-up — missing: functional impact]
"Has it affected work or any plans today?"

[User]
"I cancelled a meeting."

[EVI 3 follow-up — missing: physical symptoms]
"Any physical symptoms — pain, sleep issues, anything like that?"

[User]
"I haven't slept well for three days."

[EVI 3 closes — calls store_symptom_entry tool silently, then speaks]
"Thank you for sharing that. I've noted mood crash, functional impact,
 and disrupted sleep at day 24. I'm seeing this same pattern in your
 last three cycles. This may be worth discussing with a clinician."
```

#### What EVI 3 extracts via the tool call

The `store_symptom_entry` tool call fires mid-conversation once EVI 3 has collected sufficient data. The tool call is invisible to the user. It populates the `CycleEntry` schema (see Section 9).

Fields extracted:
- Mood: type, severity (1–5), sudden onset
- Physical: pain severity, acne, hair growth, fatigue severity, sleep disruption, bloating
- Bleeding: started/ended, flow level
- Functional impact: type, severity
- Medications or supplements mentioned
- Any urgent language (triggers safety check immediately — see Feature 5)

#### Follow-up question logic

EVI 3 is instructed via its system prompt (configured in the Hume AI dashboard) to:
- Ask only about fields that are null and clinically important.
- Never repeat a question already answered.
- Never ask more than one question per turn.
- Stop after 4 turns regardless of completeness.
- Never use clinical jargon.
- Never suggest a diagnosis.
- Acknowledge emotional distress before asking any clinical question.

#### Emotion detection in the conversation

EVI 3 surfaces emotion scores in the `onMessage` callback. The app uses these for two purposes:

1. **UI feedback** — a subtle emotion indicator shows the AI has registered the user's emotional state (e.g., a soft amber glow when distress is detected).
2. **Safety pre-screening** — if EVI 3 detects high-arousal negative affect (distress, fear, sadness above threshold), the app runs the hard-coded safety check immediately, before the transcript is processed.

```typescript
// In onMessage callback
if (message.type === 'user_message') {
  const emotions = message.models?.prosody?.scores;
  const distressScore = (emotions?.Distress ?? 0) + (emotions?.Fear ?? 0) + (emotions?.Sadness ?? 0);
  if (distressScore > 0.6) {
    // Run safety check immediately
    if (checkSafety(message.message.content)) {
      handleSafetyTrigger();
    }
  }
}
```

#### What the feature does NOT do

- Does not ask the user to rate symptoms on a numerical scale unless they volunteer a number.
- Does not store raw audio at any point.
- Does not suggest a diagnosis.
- Does not continue the conversation after a safety trigger.
- Does not use the emotion scores to infer a diagnosis.

#### UI state during conversation

| State | What the user sees |
|---|---|
| Idle | "Talk to CycleSignal" button, pulsing mic icon |
| Connecting | Spinner, "Connecting…" |
| AI speaking | Animated waveform, AI text transcript appears below |
| User speaking | Mic active indicator, user transcript appears |
| Emotion detected | Subtle ambient glow (amber = distress, green = calm) — non-intrusive |
| Processing | Brief pause indicator between turns |
| Complete | "Check-in saved" confirmation, timeline updates |
| Safety triggered | Conversation ends, safety card appears immediately |

---

### Feature 2 — Cycle Timeline (Heatmap)

#### What it is

A heatmap chart showing the user's symptoms plotted against cycle days across the last 6 months. Built with **Apache ECharts** (`echarts-for-react`). Each row is one cycle. Each column is one cycle day. Cell colour encodes symptom severity.

#### Exact layout

- X-axis: cycle day (1 to the length of the longest cycle in the dataset, max 65).
- Y-axis: each cycle as a labelled row (e.g., "Cycle 1 — Oct 2025", "Cycle 6 — Mar 2026"), oldest at top.
- Each cell: colour-coded by dominant symptom for that day:
  - Grey (#E5E7EB): no data logged.
  - Light rose (#FECDD3): mood severity 1–2.
  - Deep rose (#E11D48): mood severity 4–5.
  - Amber (#F59E0B): physical symptom (pain, acne, fatigue) without mood.
  - Blue (#3B82F6): bleeding day.
  - Dark red (#7F1D1D): safety flag (shown as a small icon, not a full cell colour).
- Hovering a cell shows a tooltip: date, cycle day, logged symptoms, severity.
- A vertical amber band highlights the premenstrual window (days −10 to −1 before bleeding) if a PMDD pattern has been detected.
- Irregular cycles (length >35 days) have their row label shown in amber.

#### What it shows

- Cycle length per cycle (irregular cycles highlighted).
- Mood severity by cycle day.
- Physical symptom markers (acne, pain, fatigue).
- Functional impact events (a small calendar-X icon overlay on the cell).
- Bleeding start and end (blue cells).

#### What it does NOT show

- Fertility predictions.
- Ovulation windows.
- Pregnancy likelihood.
- Any diagnostic label.

#### ECharts configuration (key excerpt)

```typescript
const option: EChartsOption = {
  tooltip: {
    formatter: (params) => formatCellTooltip(params.data),
  },
  grid: { top: 40, bottom: 40, left: 80, right: 20 },
  xAxis: {
    type: 'category',
    data: cycleDays, // ['Day 1', 'Day 2', ..., 'Day 65']
    name: 'Cycle Day',
  },
  yAxis: {
    type: 'category',
    data: cycleLabels, // ['Cycle 1 — Oct 2025', ...]
  },
  visualMap: {
    min: 0,
    max: 5,
    calculable: true,
    inRange: {
      color: ['#E5E7EB', '#FECDD3', '#FDA4AF', '#FB7185', '#F43F5E', '#E11D48'],
    },
  },
  series: [{
    name: 'Symptoms',
    type: 'heatmap',
    data: heatmapData, // [[cycleDay, cycleIndex, severity], ...]
    label: { show: false },
    emphasis: { itemStyle: { shadowBlur: 10 } },
  }],
};
```

---

### Feature 3 — AI Pattern Insight

#### What it is

A plain-language card on the dashboard, updated after every check-in. Generated by two components:

1. **Deterministic rules** (run first, always): check cycle length variance, count premenstrual symptom occurrences, count functional impact events.
2. **GPT-4o narrative** (run second): produces a 2–3 sentence plain-language summary of what the rules found.

#### Deterministic rules

| Rule | Trigger condition | Output label |
|---|---|---|
| Irregular cycles | ≥2 cycles with length >35 days or variance >10 days | "Irregular cycle pattern detected" |
| Premenstrual mood clustering | Mood severity ≥3 logged in days −10 to −1 in ≥3 of last 6 cycles | "Premenstrual mood pattern detected" |
| Functional impact | Functional impact logged in ≥3 of last 6 cycles | "Repeated functional impact detected" |
| PCOS signal | Irregular cycles + acne or hair growth logged ≥2 cycles | "PCOS-relevant symptoms present" |
| PMDD signal | Premenstrual mood clustering + functional impact | "PMDD-relevant pattern present" |

#### GPT-4o narrative output (example)

> "Your mood symptoms have appeared in the 5–9 days before your period in 4 of the last 6 cycles. Your cycle lengths have ranged from 38 to 61 days. You have reported missing work or cancelling plans in 3 of the last 6 cycles. This pattern may be worth discussing with a clinician."

#### GPT-4o prompt for narrative generation

```typescript
const narrativePrompt = `
You are a supportive health information assistant. Based on the following cycle pattern data, write a 2-3 sentence plain-language summary for the user. 

Rules:
- Never say "you have PCOS", "you have PMDD", or any diagnostic phrase.
- Use phrases like "this pattern may be worth discussing with a clinician."
- Be warm and factual. Do not be alarmist.
- Do not recommend any treatment, medication, or lifestyle change.

Pattern data:
${JSON.stringify(patternFlags)}
`;
```

#### What the insight does NOT say

- "You have PMDD."
- "You have PCOS."
- "Your symptoms are caused by…"
- Any treatment recommendation.

---

### Feature 4 — GP Evidence Pack

#### What it is

A one-page structured PDF the user generates on demand. Built with **@react-pdf/renderer**, generated entirely in the browser. The cycle heatmap is embedded as an SVG. No data is sent to a server to generate this document.

#### Exact contents of the GP pack

The PDF is structured as follows, in this order:

**Section 1 — Patient statement**
A one-line statement written by the user: "I want to understand whether PCOS or PMDD should be assessed." (Editable before export.)

**Section 2 — Cycle overview**
A table with: number of cycles tracked, average cycle length, range (shortest to longest), number of cycles with length >35 days, number of missed periods.

**Section 3 — Symptom timeline (embedded heatmap)**
The ECharts heatmap rendered as an SVG, embedded in the PDF using `@react-pdf/renderer`'s `<Svg>` component. This gives the GP a visual at-a-glance view of the symptom pattern.

**Section 4 — Symptom timeline summary table**
A compact table: symptom type, number of cycles it appeared in, typical cycle-day window, average severity.

**Section 5 — Functional impact**
Plain text: "The user reported missing work or cancelling plans in X of Y cycles due to symptoms."

**Section 6 — PCOS-relevant discussion points** (shown only if PCOS signal rule triggered)
Bullet list: irregular cycles, acne/hair-growth concerns, weight/metabolic notes, fertility concerns — only fields the user has logged.

**Section 7 — PMDD-relevant discussion points** (shown only if PMDD signal rule triggered)
Bullet list: premenstrual mood pattern, symptom resolution after bleeding, severity and functional impact.

**Section 8 — Red flags** (shown only if safety check was triggered at any point)
Clearly separated section: "The user has reported symptoms that may warrant urgent mental health support. Please see the attached crisis resource list."

**Section 9 — Disclaimer** (always present, cannot be removed)
> "This summary was prepared by the user using CycleSignal AI, a symptom-tracking tool. It is not a clinical diagnosis. It is not medical advice. It is intended solely to support a conversation with a clinician. CycleSignal AI is not a registered medical device."

#### User controls before export

- Toggle each section on or off (except the disclaimer, which cannot be removed).
- Edit the patient statement.
- Download as PDF (direct browser download via `@react-pdf/renderer`'s `PDFDownloadLink`).

#### @react-pdf/renderer implementation pattern

```typescript
// components/GPPack.tsx
import { Document, Page, Text, View, Svg, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10 },
  section: { marginBottom: 16 },
  heading: { fontSize: 13, fontWeight: 'bold', marginBottom: 6 },
  disclaimer: { fontSize: 8, color: '#6B7280', borderTop: '1pt solid #E5E7EB', paddingTop: 8, marginTop: 16 },
  table: { display: 'flex', flexDirection: 'column' },
  tableRow: { flexDirection: 'row', borderBottom: '0.5pt solid #E5E7EB', paddingVertical: 3 },
  tableCell: { flex: 1, paddingHorizontal: 4 },
});

export function GPPackDocument({ entries, patternFlags, patternNarrative, heatmapSvg, userStatement, visibleSections }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.heading}>Patient Statement</Text>
          <Text>{userStatement}</Text>
        </View>
        {/* Cycle overview table */}
        {/* Heatmap SVG — embedded directly */}
        {heatmapSvg && (
          <View style={styles.section}>
            <Text style={styles.heading}>Symptom Timeline</Text>
            <Svg viewBox="0 0 800 300">{/* parsed SVG nodes */}</Svg>
          </View>
        )}
        {/* ... remaining sections ... */}
        <View style={styles.disclaimer}>
          <Text>This summary was prepared by the user using CycleSignal AI, a symptom-tracking tool. It is not a clinical diagnosis. It is not medical advice. It is intended solely to support a conversation with a clinician. CycleSignal AI is not a registered medical device.</Text>
        </View>
      </Page>
    </Document>
  );
}
```

---

### Feature 5 — Safety Check

#### What it is

A hard-coded, deterministic safety layer. It is implemented as a JavaScript `RegExp` keyword matcher that runs on every text input and every voice transcript before it is passed to any AI model. It is not AI-generated and cannot be overridden by the model.

In v3.0, the safety check also runs on the EVI 3 emotion scores as a secondary trigger (see Section 6.1, emotion detection).

#### Implementation

```typescript
// lib/safety.ts
const SAFETY_KEYWORDS = [
  /\b(suicid|kill myself|end my life|don't want to be here|want to die)\b/i,
  /\b(self.?harm|cutting|hurt myself|hurting myself)\b/i,
  /\b(overdose|take all my pills)\b/i,
  /\b(can't go on|no point in living|nobody would miss me)\b/i,
];

export function checkSafety(text: string): boolean {
  return SAFETY_KEYWORDS.some((pattern) => pattern.test(text));
}

export function checkEmotionSafety(emotionScores: Record<string, number>): boolean {
  const distress = (emotionScores.Distress ?? 0) + (emotionScores.Fear ?? 0) + (emotionScores.Sadness ?? 0);
  return distress > 0.75; // High-confidence distress threshold
}
```

If `checkSafety` returns `true` OR `checkEmotionSafety` returns `true`:
1. The voice conversation stops immediately (call `disconnect()` on the Hume AI WebSocket).
2. The symptom extraction tool call is NOT triggered.
3. The triggering text is NOT stored in the `CycleEntry`.
4. The safety card appears immediately.

#### Safety card contents (exact copy)

> **It sounds like you might be going through something very difficult right now.**
>
> You don't have to face this alone. Please reach out to one of these services:
>
> - **Samaritans** — 116 123 (free, 24/7, call or email jo@samaritans.org)
> - **Shout Crisis Text Line** — Text SHOUT to 85258 (free, 24/7)
> - **NHS 111** — Call 111 and select the mental health option
> - **999 or A&E** — If you are in immediate danger
>
> CycleSignal AI is not able to provide crisis support. Please contact one of the services above.

#### What the safety check does NOT do

- Does not continue the symptom conversation after a trigger.
- Does not log the triggering content in the symptom history.
- Does not send the content to any third party.
- Does not generate an AI response to the distress.
- Does not attempt to assess severity or triage the risk.

---

### Feature 6 — Privacy Controls

#### What it is

A persistent privacy panel accessible via a lock icon in the top navigation bar on every screen.

#### Controls available

| Control | What it does |
|---|---|
| Delete a single entry | Removes one `CycleEntry` from IndexedDB |
| Delete a full cycle | Removes all entries for one cycle from IndexedDB |
| Delete all data | Calls `db.delete()` — destroys the entire IndexedDB database |
| Toggle export categories | Choose which sections appear in the GP pack |
| View data summary | Plain-language list of what is stored: "X entries across Y cycles, stored locally on this device" |
| Withdraw consent | Triggers full data deletion and resets the app to the consent screen |

#### Data storage rules

- All `CycleEntry` objects are stored in **IndexedDB via Dexie.js** on the user's device.
- No data is sent to a server unless the user explicitly exports a GP pack.
- No analytics, advertising trackers, or third-party data sharing.
- Raw voice audio is never stored. Only the structured `CycleEntry` output of the tool call is stored.
- The app does not use cookies for tracking.
- On iOS Safari, IndexedDB data may be evicted after 7 days of inactivity. The privacy panel displays a warning: "On some mobile browsers, data may be cleared if the app is not used for 7 days. Export your GP pack to preserve your records."

#### Consent flow (shown on first launch only)

Before any data is collected, the user sees a single-screen consent modal with:

1. A plain-language summary of what data is collected and why.
2. An unticked checkbox: "I understand that CycleSignal AI stores my health information locally on this device and that I can delete it at any time."
3. A link to the full privacy notice.
4. A "Continue" button that is disabled until the checkbox is ticked.

This satisfies the UK GDPR Article 9(2)(a) requirement for explicit, freely given, informed, and unambiguous consent for special category health data.

---

## 7. Screens and Navigation

The app has five screens. Navigation is via a persistent top bar.

| Screen | Route | Description |
|---|---|---|
| **Dashboard** | `/` | Default landing screen. Shows cycle heatmap, pattern insight card, and "Talk to CycleSignal" button. |
| **Check-In** | `/checkin` | Voice conversation interface. Mic button, waveform, transcript, emotion indicator, turn counter. |
| **GP Pack** | `/gp-pack` | GP evidence pack preview with section toggles and export button. |
| **History** | `/history` | Scrollable list of all past `CycleEntry` records with edit/delete per entry. |
| **Privacy** | `/privacy` | Privacy controls panel. |

The app launches directly to `/` (Dashboard) with synthetic data preloaded. There is no onboarding screen in the demo build.

---

## 8. Demo Configuration

The app launches directly into the Dashboard. There is no login, no onboarding, and no empty state. The demo user (Amara) has 6 months of preloaded synthetic cycle data.

#### Synthetic data characteristics

- 6 cycles loaded, lengths: 42, 38, 55, 61, 44, 39 days (irregular, PCOS-consistent).
- Mood crashes (severity 4–5) logged in days 22–27 of each cycle (premenstrual, PMDD-consistent).
- Functional impact (missed work, cancelled plans) logged in 4 of 6 cycles.
- Acne logged in 3 of 6 cycles.
- Fatigue logged in 5 of 6 cycles.
- No urgent/safety-trigger language in the preloaded data.
- All entries have `source: "synthetic"`.

#### Demo flow for judges (target: 60 seconds)

1. Open app → Dashboard with 6-month heatmap visible immediately.
2. Pattern insight card shows: *"Mood symptoms appear in days 22–27 in 4 of 6 cycles. Cycle lengths have ranged from 38 to 61 days. This pattern may be worth discussing with a clinician."*
3. Tap "Talk to CycleSignal" → 30-second live voice conversation with EVI 3.
4. Heatmap updates with new entry.
5. Tap "Generate GP Pack" → one-page PDF preview with embedded heatmap appears.
6. Show privacy controls panel — tap "Delete all data" to demonstrate.

---

## 9. Data Schema

Every check-in produces one `CycleEntry` object. This is the only data structure stored in IndexedDB.

```typescript
type MoodEntry = {
  present: boolean;
  types: Array<"low" | "anxious" | "irritable" | "tearful" | "angry" | "hopeless">;
  severity: 1 | 2 | 3 | 4 | 5;
  suddenOnset: boolean;
};

type PhysicalEntry = {
  pain: { present: boolean; severity: 1 | 2 | 3 | 4 | 5 } | null;
  acne: boolean;
  hairGrowth: boolean;
  fatigue: { present: boolean; severity: 1 | 2 | 3 | 4 | 5 } | null;
  sleep: { disrupted: boolean; nightsAffected: number } | null;
  bloating: boolean;
  other: string[];
};

type BleedingEntry = {
  started: boolean;
  ended: boolean;
  flow: "none" | "spotting" | "light" | "medium" | "heavy" | null;
};

type FunctionalImpact = {
  present: boolean;
  types: Array<"missed_work" | "cancelled_plans" | "relationship_disruption" | "unable_to_care_for_self">;
  severity: "mild" | "moderate" | "severe" | null;
};

type EmotionSnapshot = {
  distress: number;   // 0–1 from EVI 3 prosody scores
  sadness: number;    // 0–1
  fear: number;       // 0–1
  calmness: number;   // 0–1
};

type CycleEntry = {
  id: string;                        // nanoid()
  date: string;                      // ISO 8601 date, e.g. "2026-06-07"
  cycleDay: number;                  // Day number within current cycle (1-indexed)
  cycleNumber: number;               // Which cycle in the dataset (1 = oldest)
  mood: MoodEntry | null;
  physical: PhysicalEntry;
  bleeding: BleedingEntry;
  functionalImpact: FunctionalImpact;
  medications: string[];
  emotionSnapshot: EmotionSnapshot | null;  // NEW in v3: from EVI 3 prosody scores
  conversationTranscript: string;    // Plain text only. No audio. Max 2000 chars.
  source: "voice" | "text" | "synthetic";
  safetyFlagged: boolean;            // true if safety check triggered. Content NOT stored.
  consentTimestamp: string;          // ISO 8601 datetime of user consent
};
```

---

## 10. AI Agent Responsibilities

| Agent | Implemented as | Responsibility |
|---|---|---|
| **Conversation Agent** | Hume AI EVI 3 (system prompt in Hume Config) | Drives the voice dialogue; detects emotion; decides follow-up questions; closes the session after 4 turns; calls `store_symptom_entry` tool |
| **Extraction Agent** | EVI 3 tool call (`store_symptom_entry`) + GPT-4o fallback | Populates the `CycleEntry` schema from the conversation |
| **Pattern Agent** | Deterministic TypeScript functions | Calculates cycle length variance, premenstrual clustering, functional impact frequency |
| **Signal Agent** | GPT-4o chat completion (non-voice) | Generates the plain-language pattern insight card narrative |
| **Safety Agent** | Hard-coded `RegExp` + EVI 3 emotion threshold | Runs on every input before any AI processing; also monitors emotion scores |
| **Privacy Agent** | Client-side toggle logic | Filters `CycleEntry` fields before GP pack generation |
| **Evidence Agent** | @react-pdf/renderer template | Renders the GP pack PDF from filtered `CycleEntry` data with embedded ECharts SVG |

---

## 11. Non-Negotiable Constraints

1. The app never uses the words "diagnosis," "you have," "you are suffering from," or any equivalent.
2. The safety check is hard-coded. It is never delegated to the AI.
3. No raw audio is ever stored.
4. No data leaves the device without explicit user action.
5. Every GP pack export includes the disclaimer that it is not a clinical diagnosis.
6. The app does not collect data for advertising, analytics, or product improvement without explicit opt-in.
7. The Hume AI API key is never exposed to the browser. A backend token endpoint is required.
8. The OpenAI API key is never exposed to the browser. It is called server-side or via a secure proxy.
9. The consent checkbox must be unticked by default. Pre-ticked consent is not valid under UK GDPR.
10. The safety card phone numbers are hard-coded and must match exactly: Samaritans 116 123, Shout 85258, NHS 111.
11. The GP pack disclaimer section cannot be toggled off by the user.
12. EVI 3 emotion scores are used only for safety pre-screening and ambient UI feedback. They are not stored as diagnostic data.

---

## 12. Dependencies to Install

```bash
# Voice AI
pnpm add @humeai/voice-react

# LLM
pnpm add openai

# Local storage
pnpm add dexie

# PDF generation
pnpm add @react-pdf/renderer

# Charts (heatmap)
pnpm add echarts echarts-for-react

# Utilities
pnpm add nanoid zod
```

---

## 13. Out of Scope (Hackathon MVP)

| Out of scope | Reason |
|---|---|
| User accounts / authentication | Unnecessary for demo |
| Server-side data storage | Local-first is the privacy promise |
| Fertility tracking or ovulation prediction | Different product category |
| Medication reminders | Out of clinical scope |
| Integration with NHS systems | Not feasible in hackathon timeframe |
| Native mobile app | Web demo is sufficient |
| Multi-user or partner mode | Out of scope |
| Subscription or payments | Not needed for demo |
| Shareable ephemeral link | Client-side encoding without a backend is not secure enough for health data |
| ElevenLabs as standalone TTS | EVI 3 handles voice output natively; ElevenLabs is not needed as a separate layer |

---

## 14. Success Criteria (Hackathon)

| Criterion | Definition of success |
|---|---|
| Demo completeness | Judge completes the full demo flow in under 60 seconds |
| Voice conversation | At least one live AI-guided voice check-in works end-to-end with EVI 3 |
| Emotion detection | AI visibly adapts tone when user expresses distress |
| Pattern insight | Dashboard shows a meaningful pattern from preloaded data |
| GP pack | One-page PDF with embedded heatmap generates correctly from synthetic data |
| Safety check | Typing a trigger phrase produces the safety card immediately, conversation stops |
| Privacy controls | User can delete all data in one action |
| Non-diagnostic language | No diagnostic claim appears anywhere in the app |

---

*End of PRD v3.0*

