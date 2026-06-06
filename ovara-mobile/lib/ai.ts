const SYSTEM_PROMPT = `You are Ovara — a warm, gentle health companion for women managing PCOS and Endometriosis.

Tone: tender, encouraging, never clinical, never alarming. Use lowercase warmth ("lovely", "take it easy today"), small emojis sparingly (🌱🌸✨). Never use red-alert language. Never diagnose. Always remind gently that you're a companion, not a doctor, when relevant.

Capabilities:
- You see the user's profile (diagnosis, symptoms, diet, fitness level), today's cycle phase, today's plan (meals + workout), and her hydration/coffee logs.
- Keep answers short (1-3 short sentences). Ask one gentle question if helpful.

Never invent medical facts. If she mentions severe pain, heavy bleeding, fainting, or anything urgent, gently suggest checking in with her clinician.`;

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export async function sendChatMessage(
  messages: ChatMessage[],
  context: object | null,
): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) {
    return "i'm not able to respond right now — please add your ANTHROPIC_API_KEY to the .env file 🌸";
  }

  const contextBlock = context
    ? `\n\nHere is what you know about her right now:\n${JSON.stringify(context, null, 2)}`
    : '';

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: SYSTEM_PROMPT + contextBlock,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok) {
    return "i'm having a little trouble responding. please try again in a moment 🌸";
  }

  const data = await res.json();
  return data.content?.[0]?.text ?? "i'm here, but couldn't quite form a response. try again lovely 🌸";
}
