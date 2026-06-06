export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type Context = {
  profile?: { name: string; diagnosis: string[]; symptoms: string[]; fitness: string };
  cycle?: { phase: string; dayOfCycle: number };
  today?: { waterMl: number; coffeeCount: number; goalMl: number };
} | null;

type Rule = { keywords: string[]; reply: (ctx: Context) => string };

const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

const name = (ctx: Context) => ctx?.profile?.name ?? 'lovely';
const phase = (ctx: Context) => ctx?.cycle?.phase ?? 'your cycle';

const RULES: Rule[] = [
  {
    keywords: ['hi', 'hey', 'hello', 'hiya', 'sup'],
    reply: (ctx) =>
      pick([
        `hi ${name(ctx)} 🌸 how are you feeling today?`,
        `hey ${name(ctx)} ✨ so glad you checked in. what's on your mind?`,
        `hello ${name(ctx)} 🌱 how is your day going so far?`,
      ]),
  },
  {
    keywords: ['breakfast', 'ate', 'lunch', 'dinner', 'snack', 'meal', 'food', 'eating', 'eaten'],
    reply: (ctx) =>
      pick([
        `that's lovely — nourishing yourself well during ${phase(ctx)} really does help 🌸`,
        `so good that you're eating regularly ${name(ctx)}. how did it sit with you?`,
        `warm nourishment during this phase is such a gentle gift to your body ✨`,
      ]),
  },
  {
    keywords: ['water', 'hydrat', 'drink', 'drank', 'thirsty'],
    reply: (ctx) => {
      const ml = ctx?.today?.waterMl ?? 0;
      const goal = ctx?.today?.goalMl ?? 2200;
      const pct = Math.round((ml / goal) * 100);
      if (pct >= 80)
        return `you're doing so well with hydration today — ${pct}% of your goal 💧 keep it up ${name(ctx)}`;
      return `every sip counts 💧 you're at ${pct}% of your water goal today — keep going ${name(ctx)}`;
    },
  },
  {
    keywords: ['coffee', 'caffeine', 'espresso', 'latte', 'cappuccino'],
    reply: (ctx) => {
      const cups = ctx?.today?.coffeeCount ?? 0;
      if (cups >= 3)
        return `${cups} coffees today — that's a lot for your hormones lovely. maybe try herbal tea next? 🌿`;
      return `a little coffee is okay 🌿 just keep an eye on it — caffeine and ${phase(ctx)} don't always get along`;
    },
  },
  {
    keywords: ['tired', 'exhausted', 'fatigue', 'sleepy', 'no energy', 'low energy', 'drained'],
    reply: (ctx) =>
      pick([
        `fatigue during ${phase(ctx)} is so real ${name(ctx)} — your body is working hard. rest is productive too 🌙`,
        `being tired is your body asking for something. can you carve out even 10 minutes of stillness? 🌸`,
        `low energy right now makes complete sense. be gentle with yourself today ${name(ctx)} ✨`,
      ]),
  },
  {
    keywords: ['cramp', 'pain', 'ache', 'pelvic', 'hurt', 'sore'],
    reply: (ctx) =>
      pick([
        `i'm sorry you're in pain ${name(ctx)} 🌸 a heat pad and gentle movement can help. if it feels severe, please check in with your clinician`,
        `cramps are so tough. warm food, rest, and a hot water bottle can be soothing 🌿 you're not alone in this`,
        `sending you the gentlest hug ${name(ctx)}. pain during this time is valid — please rest as much as you can`,
      ]),
  },
  {
    keywords: ['bloat', 'bloating', 'stomach', 'gassy', 'digest'],
    reply: () =>
      pick([
        `bloating is such a common companion with PCOS and Endo 🌿 warm ginger tea can help settle things`,
        `try to avoid raw veg and carbonated drinks for now — warm, cooked foods are kinder to your gut during this phase 🌸`,
      ]),
  },
  {
    keywords: ['workout', 'exercise', 'gym', 'run', 'yoga', 'pilates', 'walk', 'movement'],
    reply: (ctx) =>
      pick([
        `movement during ${phase(ctx)} is lovely — just listen to your body and ease off if needed 🌱`,
        `any movement counts ${name(ctx)} — even a short walk is a gift to yourself ✨`,
        `gentle is always enough. your body does not need to be pushed today 🌸`,
      ]),
  },
  {
    keywords: ['skip', 'skipped', 'missed', 'didn\'t', 'didnt', 'couldn\'t', 'couldnt'],
    reply: (ctx) =>
      pick([
        `that's completely okay ${name(ctx)} — rest is part of the plan too 🌸`,
        `skipping one thing doesn't undo everything. be kind to yourself today ✨`,
        `your body asked for a break and you listened — that's actually really wise 🌱`,
      ]),
  },
  {
    keywords: ['sad', 'cry', 'crying', 'emotional', 'mood', 'anxious', 'anxiety', 'stressed', 'overwhelm', 'down'],
    reply: (ctx) =>
      pick([
        `your feelings are completely valid ${name(ctx)} 🌸 hormonal shifts during ${phase(ctx)} can make emotions feel louder`,
        `it's okay to feel this way. be extra gentle with yourself today — what's one small comfort you could give yourself? ✨`,
        `emotions run deeper during this phase — you're not being dramatic, your body chemistry is real 🌿`,
      ]),
  },
  {
    keywords: ['good', 'great', 'amazing', 'wonderful', 'fantastic', 'happy', 'bright', 'well'],
    reply: (ctx) =>
      pick([
        `that makes me so happy to hear ${name(ctx)} ✨ hold onto that feeling today`,
        `love this for you 🌸 what's been making you feel good?`,
        `radiant energy during ${phase(ctx)} — lean into it 🌱`,
      ]),
  },
  {
    keywords: ['period', 'menstruat', 'bleed', 'flow', 'cycle'],
    reply: (ctx) =>
      pick([
        `rest, warmth, and iron-rich foods are your best friends right now ${name(ctx)} 🌸`,
        `your body is doing something remarkable. be extra soft with yourself this week ✨`,
        `warm baths, heating pads, and gentle movement — you've got this ${name(ctx)} 🌿`,
      ]),
  },
  {
    keywords: ['sleep', 'insomnia', 'can\'t sleep', 'cant sleep', 'rest', 'nap'],
    reply: (ctx) =>
      pick([
        `sleep disruption is common during ${phase(ctx)} — try keeping the room cool and avoiding screens an hour before bed 🌙`,
        `rest is healing ${name(ctx)} — even lying still counts. magnesium-rich foods can help with sleep too 🌿`,
      ]),
  },
  {
    keywords: ['thank', 'thanks', 'grateful', 'appreciate'],
    reply: (ctx) =>
      pick([
        `always here for you ${name(ctx)} 🌸`,
        `you deserve all the softness ✨`,
        `rooting for you every day 🌱`,
      ]),
  },
];

const FALLBACK_REPLIES = [
  (ctx: Context) => `tell me more ${name(ctx)} — i'm listening 🌸`,
  (ctx: Context) => `how long have you been feeling this way ${name(ctx)}? 🌿`,
  (ctx: Context) => `i hear you. what would feel most supportive right now? ✨`,
  (ctx: Context) => `thank you for sharing that with me ${name(ctx)} 🌸 what else is on your mind?`,
  (ctx: Context) => `you're doing so well just by checking in. what does your body need today? 🌱`,
];

export async function sendChatMessage(
  messages: ChatMessage[],
  context: Context,
): Promise<string> {
  const last = messages.filter((m) => m.role === 'user').at(-1);
  if (!last) return `hi ${name(context)} 🌸 how are you feeling today?`;

  const text = last.content.toLowerCase();

  for (const rule of RULES) {
    if (rule.keywords.some((kw) => text.includes(kw))) {
      return rule.reply(context);
    }
  }

  const fallback = FALLBACK_REPLIES[Math.floor(Math.random() * FALLBACK_REPLIES.length)];
  return fallback(context);
}
