import { CycleEntry, EmotionSnapshot } from '../types';
import { Emotion } from '../components/EmotionPill';
import { RingMode } from '../components/ListeningRing';
import { checkSafety, checkEmotionSafety, classifyCrisisSecondary } from './safety';
import { buildEntryFromToolArgs, extractEntrySmart } from './extraction';

// Voice Conversation Layer — PRD Feature 1 / Section 5.1: live Hume AI EVI 3.
//
// Protocol-correct EVI 3 session manager (the RN parallel to the Flutter
// HumeVoiceService). It opens the EVI chat WebSocket with a SHORT-LIVED access
// token minted by our backend (`/hume/token`) — the Hume key never reaches the
// device (Constraint #7), which is stricter than passing an api_key client-side.
//
// It surfaces transcript + prosody emotion, runs the deterministic safety RegExp
// on every user turn BEFORE anything else (Constraint #2), adds the async Haiku
// classifier (5.5), and handles the `store_symptom_entry` tool call (6.1). No raw
// audio is ever persisted (Constraint #3).
//
// Audio I/O note: streaming mic PCM to EVI needs a native module + a custom dev
// build (not Expo Go). So this manager drives the turn loop over EVI's text input
// channel (`user_input`) — which works everywhere — and treats `audio_output` as
// best-effort (skipped when no native player is present). The transcript is the
// demo surface either way. On a dev build, the audio hooks below are where mic
// capture / playback would attach.

export type VoicePhase = 'connecting' | 'talking' | 'saved' | 'error';

export type VoiceSnapshot = {
  phase: VoicePhase;
  mode: RingMode;
  turns: { role: 'ai' | 'user'; text: string; emotion?: Emotion }[];
  emotion: Emotion | null;
  userTurns: number;
  errorMessage: string | null;
};

export type EviSessionOptions = {
  token: string;
  configId: string | null;
  cycleDay: number;
  cycleNumber: number;
  consentTimestamp: string;
  emotionSnapshot?: EmotionSnapshot | null;
  onUpdate: (snapshot: VoiceSnapshot) => void;
  onStored: (entry: CycleEntry) => void;
  onSafety: () => void;
};

export class EviSession {
  private ws: WebSocket | null = null;
  private disposed = false;
  private stored = false;
  private ended = false; // set on any intentional end (safety, finish, fail, dispose)

  private phase: VoicePhase = 'connecting';
  private mode: RingMode = 'ai';
  private turns: VoiceSnapshot['turns'] = [];
  private emotion: Emotion | null = null;
  private userTurns = 0;
  private errorMessage: string | null = null;

  private lastSnapshot: EmotionSnapshot = {
    distress: 0,
    sadness: 0,
    fear: 0,
    calmness: 0.5,
  };

  constructor(private readonly opts: EviSessionOptions) {}

  snapshot(): VoiceSnapshot {
    return {
      phase: this.phase,
      mode: this.mode,
      turns: this.turns,
      emotion: this.emotion,
      userTurns: this.userTurns,
      errorMessage: this.errorMessage,
    };
  }

  private emit() {
    if (!this.disposed) this.opts.onUpdate(this.snapshot());
  }

  start() {
    try {
      // Build the query string manually — RN/Hermes URLSearchParams.toString() is
      // unreliable. access_token keeps the Hume key off the device (Constraint #7).
      let url = `wss://api.hume.ai/v0/evi/chat?access_token=${encodeURIComponent(this.opts.token)}&evi_version=3`;
      if (this.opts.configId) url += `&config_id=${encodeURIComponent(this.opts.configId)}`;
      const ws = new WebSocket(url);
      this.ws = ws;
      ws.onopen = () => {
        if (this.disposed) return;
        this.phase = 'talking';
        this.mode = 'ai';
        this.emit();
      };
      ws.onmessage = (e) => this.onMessage(e.data);
      ws.onerror = () => this.fail('Could not reach Hume EVI.');
      ws.onclose = () => {
        // Only auto-finish on an UNEXPECTED close mid-conversation. Intentional ends
        // (safety, finish, fail, dispose) set `ended` first, so this never re-stores
        // after a safety trigger (Feature 5: nothing stored).
        if (this.ended || this.disposed) return;
        if (this.phase === 'talking') void this.finishAndStore();
      };
    } catch (err) {
      this.fail(String(err));
    }
  }

  // Drive the conversation by injecting the user's typed text as a turn. The
  // deterministic safety RegExp has already run synchronously in the caller.
  sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: 'user_input', text: trimmed }));
  }

  private onMessage(raw: unknown) {
    if (typeof raw !== 'string') return;
    let msg: any;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    switch (msg?.type) {
      case 'user_message':
        this.handleUserMessage(msg);
        break;
      case 'assistant_message': {
        const text = String(msg.message?.content ?? '');
        if (text) this.addTurn({ role: 'ai', text });
        this.mode = 'ai';
        this.emotion = null;
        this.emit();
        break;
      }
      case 'assistant_end':
        this.mode = 'idle';
        this.emit();
        break;
      case 'tool_call':
        this.handleToolCall(msg);
        break;
      case 'audio_output':
        // Best-effort only — no native player in Expo Go; transcript carries the turn.
        break;
      case 'error':
        this.fail(String(msg.message ?? 'EVI error'));
        break;
      default:
        break;
    }
  }

  private handleUserMessage(msg: any) {
    const content = String(msg.message?.content ?? '');
    const scores = this.extractScores(msg);

    // PRIMARY safety gate — deterministic, before any AI processing (Constraint #2).
    if ((content && checkSafety(content)) || checkEmotionSafety(scores)) {
      this.triggerSafety();
      return;
    }
    if (!content) return;

    this.lastSnapshot = {
      distress: scores.Distress ?? 0,
      sadness: scores.Sadness ?? 0,
      fear: scores.Fear ?? 0,
      calmness: scores.Calmness ?? 0,
    };
    this.emotion = this.emotionLabel(scores);
    this.userTurns += 1;
    this.mode = 'user';
    this.addTurn({ role: 'user', text: content, emotion: this.emotion ?? undefined });

    // SECONDARY async classifier — only ADDS detections, never blocks (5.5).
    classifyCrisisSecondary(content)
      .then((flag) => {
        if (flag && !this.disposed && this.phase === 'talking') this.triggerSafety();
      })
      .catch(() => {});
  }

  private extractScores(msg: any): Record<string, number> {
    const raw = msg.models?.prosody?.scores ?? msg.models?.language?.scores;
    const out: Record<string, number> = {};
    if (raw && typeof raw === 'object') {
      for (const [k, v] of Object.entries(raw)) {
        if (typeof v === 'number') out[k] = v;
      }
    }
    return out;
  }

  private emotionLabel(s: Record<string, number>): Emotion | null {
    if (Object.keys(s).length === 0) return null;
    const distress = (s.Distress ?? 0) + (s.Fear ?? 0) + (s.Sadness ?? 0);
    if (distress > 0.5) return 'Distressed';
    if ((s.Tiredness ?? 0) > 0.4) return 'Tired';
    if ((s.Anxiety ?? s.Fear ?? 0) > 0.4) return 'Anxious';
    if ((s.Calmness ?? 0) > 0.4) return 'Calm';
    return null;
  }

  private handleToolCall(msg: any) {
    if (msg.name !== 'store_symptom_entry' || this.stored) return;
    let args: Record<string, any> = {};
    try {
      args = typeof msg.parameters === 'string' ? JSON.parse(msg.parameters) : msg.parameters ?? {};
    } catch {
      args = {};
    }
    this.stored = true;
    const entry = buildEntryFromToolArgs(args, {
      transcript: this.transcript(),
      cycleDay: this.opts.cycleDay,
      cycleNumber: this.opts.cycleNumber,
      consentTimestamp: this.opts.consentTimestamp,
      emotionSnapshot: this.lastSnapshot,
      source: 'voice',
    });
    this.opts.onStored(entry);
    if (msg.tool_call_id && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({ type: 'tool_response', tool_call_id: msg.tool_call_id, content: 'Stored.' })
      );
    }
  }

  private transcript(): string {
    return this.turns
      .map((t) => `${t.role === 'ai' ? 'CycleSignal' : 'Amara'}: ${t.text}`)
      .join('\n')
      .slice(0, 2000);
  }

  // Natural end (user taps End, or socket closes) without a tool call: extract
  // from the transcript via the backend (GPT-5.4 Mini) with on-device fallback.
  async finishAndStore() {
    this.ended = true;
    // Already stored mid-conversation via the tool call — just settle the UI.
    if (this.stored) {
      this.phase = 'saved';
      this.emit();
      this.teardown();
      return;
    }
    const transcript = this.transcript();
    if (!transcript.trim()) {
      this.phase = 'saved';
      this.emit();
      this.teardown();
      return;
    }
    this.stored = true;
    const entry = await extractEntrySmart({
      transcript,
      cycleDay: this.opts.cycleDay,
      cycleNumber: this.opts.cycleNumber,
      consentTimestamp: this.opts.consentTimestamp,
      emotionSnapshot: this.lastSnapshot,
      source: 'voice',
    });
    if (this.disposed) return;
    this.opts.onStored(entry);
    this.phase = 'saved';
    this.emit();
    this.teardown();
  }

  private triggerSafety() {
    // PRD Feature 5: conversation stops immediately, nothing stored.
    this.ended = true;
    this.teardown();
    this.opts.onSafety();
  }

  private addTurn(turn: VoiceSnapshot['turns'][number]) {
    this.turns = [...this.turns, turn];
    this.emit();
  }

  private fail(message: string) {
    if (this.disposed || this.ended) return;
    this.ended = true;
    this.errorMessage = message;
    this.phase = 'error';
    this.emit();
    this.teardown();
  }

  private teardown() {
    try {
      this.ws?.close();
    } catch {
      /* noop */
    }
    this.ws = null;
  }

  dispose() {
    this.disposed = true;
    this.ended = true;
    this.teardown();
  }
}
