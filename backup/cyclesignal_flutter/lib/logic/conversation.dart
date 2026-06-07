import '../services/hume_voice_service.dart' show ConvTurn;

/// Offline demo script — PRD Feature 1 exact flow. Used ONLY when Hume EVI is not
/// configured (no HUME_API_KEY / HUME_TOKEN_ENDPOINT), so the check-in still runs
/// end-to-end. The live path uses real EVI 3 voice. Even on this path the real
/// safety regex runs on every line and real extraction produces the CycleEntry.
const checkinScript = <ConvTurn>[
  ConvTurn('ai', "Hi Amara. You're on day 24. How are you feeling today?"),
  ConvTurn('user', "I've been really low. I couldn't get out of bed this morning.", 'Distressed'),
  ConvTurn('ai',
      'That sounds really hard. Is this the kind of low that feels different from normal tiredness — more like a sudden crash?'),
  ConvTurn('user', 'Yes, exactly. It always happens around now.', 'Tired'),
  ConvTurn('ai', 'Has it affected work or any plans today?'),
  ConvTurn('user', 'I cancelled a meeting.', 'Tired'),
  ConvTurn('ai', 'Any physical symptoms — pain, sleep issues, anything like that?'),
  ConvTurn('user', "I haven't slept well for three days.", 'Tired'),
  ConvTurn('ai',
      "Thank you for sharing that. I've noted mood crash, functional impact, and disrupted sleep at day 24. I'm seeing this same pattern in your last three cycles. This may be worth discussing with a clinician."),
];

const totalUserTurns = 4;

int dwellMsFor(ConvTurn t) =>
    t.role == 'ai' ? (2200 > t.text.length * 32 ? 2200 : t.text.length * 32) : 1900;
