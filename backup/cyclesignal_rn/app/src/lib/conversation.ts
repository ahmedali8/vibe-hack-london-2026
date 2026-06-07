import { Emotion } from '../components/EmotionPill';

// Scripted EVI 3 conversation — PRD Feature 1 exact flow.
// In production this is a live Hume AI EVI 3 voice session (token from a backend, WebSocket,
// real-time prosody emotion). On-device we replay the PRD's scripted 4-turn check-in so the
// demo runs with no key, no mic permission, and no audio ever stored (Constraint #3).

export type Turn = {
  role: 'ai' | 'user';
  text: string;
  emotion?: Emotion; // prosody emotion surfaced for user turns
};

export const CHECKIN_SCRIPT: Turn[] = [
  { role: 'ai', text: "Hi Amara. You're on day 24. How are you feeling today?" },
  {
    role: 'user',
    text: "I've been really low. I couldn't get out of bed this morning.",
    emotion: 'Distressed',
  },
  {
    role: 'ai',
    text:
      'That sounds really hard. Is this the kind of low that feels different from normal tiredness — more like a sudden crash?',
  },
  { role: 'user', text: 'Yes, exactly. It always happens around now.', emotion: 'Tired' },
  { role: 'ai', text: 'Has it affected work or any plans today?' },
  { role: 'user', text: 'I cancelled a meeting.', emotion: 'Tired' },
  { role: 'ai', text: 'Any physical symptoms — pain, sleep issues, anything like that?' },
  { role: 'user', text: "I haven't slept well for three days.", emotion: 'Tired' },
  {
    role: 'ai',
    text:
      "Thank you for sharing that. I've noted mood crash, functional impact, and disrupted sleep at day 24. I'm seeing this same pattern in your last three cycles. This may be worth discussing with a clinician.",
  },
];

export const TOTAL_USER_TURNS = CHECKIN_SCRIPT.filter((t) => t.role === 'user').length; // 4

// Dwell time a line stays "spoken" before the next line plays.
export function dwellFor(turn: Turn): number {
  return turn.role === 'ai' ? Math.max(2200, turn.text.length * 32) : 1900;
}

export function buildTranscript(turns: Turn[], notes: string[]): string {
  const lines = turns.map((t) => `${t.role === 'ai' ? 'CycleSignal' : 'Amara'}: ${t.text}`);
  for (const n of notes) lines.push(`Amara: ${n}`);
  return lines.join('\n').slice(0, 2000);
}
