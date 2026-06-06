
# Ovara — Build Plan

A mobile-first, cartoonish-but-clean health companion for women managing PCOS and Endometriosis. Three pillars: diet, workout, cycle tracking, tied together by an AI that adapts the daily plan.

## Scope for this build

A fully clickable front-end prototype with realistic mock data and a working AI chat. No account system yet — onboarding answers persist locally so the app feels real on reload. Lovable Cloud + Lovable AI power the chat and adaptive plan logic.

## Design direction

Before writing screens I'll generate 3 rendered design directions (all locked to the pastel palette + bubbly type you described) so you can pick the exact visual feel. They'll vary in composition, mascot style, and how the cycle phase is visualized (moon vs. bloom vs. abstract orb). You pick one, I build it.

Locked tokens across all directions:
- Palette: dusty rose, soft lavender, warm cream, sage green, soft amber for nudges
- Type: bubbly + readable (Nunito or Fraunces-paired alternative shown in the directions)
- Radius: generously rounded everywhere (cards 24–32px, chips fully pill)
- No reds, no harsh alerts — amber/lavender for changes
- Mobile-first single column, lots of whitespace

## Screens & routes

```text
/onboarding         multi-step intake (chips only, progress dots)
/                   home dashboard (today's plan)
/chat               AI check-in chat
/reflection         end-of-day wrap-up
```

Plan-update cards appear inline in chat and on the dashboard via a slide-in animated card (Framer Motion) — not a separate route.

### 1. Onboarding
Welcome screen with mascot illustration → 5 chip-based intake cards:
- Cycle status (regular / irregular / not sure / not currently menstruating)
- Diagnosis (PCOS / Endo / both / suspected / exploring)
- Top symptoms (multi-select chips: cramps, fatigue, bloating, mood, acne, cravings…)
- Diet preference (omnivore / vegetarian / vegan / GF / DF / no preference)
- Fitness level (gentle / moderate / active)

Progress dots at top, one big "Next" button, back arrow. Answers stored in Cloud (or localStorage if user skips signup).

### 2. Home dashboard
- Friendly time-aware greeting ("Good morning, Maya")
- Cycle phase visual (moon-phase or bloom — chosen in design direction) with phase name + 1-line "what this means today"
- Today's diet card (3 meals + snack, tap to expand)
- Today's workout card (duration, type, intensity badge)
- Hydration tracker (water glasses + coffee count, tap to increment — 1 tap to log)
- Floating chat button → /chat

### 3. Chat check-in
- Chat-style UI built on AI Elements (Conversation, Message, PromptInput)
- Quick-reply chips above composer ("Had my breakfast", "Feeling tired", "Extra coffee", "Skipped workout")
- Photo upload button (meal photo) — sent as image part to the model
- AI responds warmly, may emit a `plan_update` tool call → renders the animated Plan Update card inline
- Streaming responses, markdown rendering

### 4. Plan update card
- Slides in (Framer Motion) when AI adapts the plan
- Shows: what changed, why, soft amber/lavender accent
- "Got it" + "Undo" actions

### 5. End of day reflection
- Mood selector (5 soft emoji faces)
- 1–2 AI-generated insights from today's logs
- Tomorrow's plan preview card
- "Sleep well 🌙" closer

## Technical approach

- **Stack:** TanStack Start (existing), Tailwind v4, Framer Motion for the playful micro-animations and slide-in cards, AI Elements for the chat surface.
- **Backend:** Enable Lovable Cloud for persisting onboarding answers, daily logs, hydration counts, and chat history. Tables: `profiles`, `daily_plans`, `daily_logs`, `chat_messages`, `hydration_entries`. RLS on `auth.uid()` (anonymous auth so no signup friction).
- **AI:** Lovable AI Gateway via `/api/chat` server route, model `google/gemini-3-flash-preview`. Tools: `update_plan` (mutates today's plan), `log_meal_from_photo` (vision), `generate_reflection`. System prompt enforces warm, non-clinical tone and PCOS/Endo awareness with a disclaimer that it's not medical advice.
- **Mascot & illustrations:** Generate a small set of simple cartoon assets (mascot in 3–4 poses, phase icons, empty states) with the image tool — kept simple and on-palette.
- **Design tokens:** All colors as oklch in `src/styles.css`, semantic tokens (`--phase-follicular`, `--accent-amber`, etc.), no raw hex in components.

## Build order

1. Generate 3 design directions → you pick one
2. Set up design tokens + Tailwind theme from the chosen direction
3. Generate mascot + illustration assets
4. Enable Lovable Cloud, create tables + RLS, wire anonymous auth
5. Onboarding flow
6. Home dashboard with mock data wired to Cloud
7. AI chat (server route + AI Elements UI + tools)
8. Animated plan update card
9. End-of-day reflection
10. Polish: motion, empty states, loading skeletons, a11y pass

## Out of scope (for now)

- Real account/email signup (anonymous auth instead)
- Notifications / reminders
- Healthcare provider exports
- Payment / subscription
- Native mobile build

Ready to start with the design directions when you approve.
