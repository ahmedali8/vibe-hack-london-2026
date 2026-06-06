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
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    return "i'm not able to respond right now — please add your GEMINI_API_KEY to the .env file 🌸";
  }

  const contextBlock = context
    ? `\n\nHere is what you know about her right now:\n${JSON.stringify(context, null, 2)}`
    : '';

  // Gemini expects messages as alternating user/model turns.
  // We prepend the system prompt as the first user turn + a model ack.
  const geminiContents = [
    { role: 'user', parts: [{ text: SYSTEM_PROMPT + contextBlock }] },
    { role: 'model', parts: [{ text: 'understood 🌸' }] },
    ...messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
  ];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: geminiContents,
        generationConfig: { maxOutputTokens: 512, temperature: 0.7 },
      }),
    },
  );

  if (!res.ok) {
    return "i'm having a little trouble responding. please try again in a moment 🌸";
  }

  const data = await res.json();
  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text ??
    "i'm here, but couldn't quite form a response. try again lovely 🌸"
  );
}
