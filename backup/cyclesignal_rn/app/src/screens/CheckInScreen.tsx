import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, Check, Send, X } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { fonts, type } from '../theme/typography';
import { useApp } from '../context/AppContext';
import { ListeningRing, RingMode } from '../components/ListeningRing';
import { EmotionPill, Emotion } from '../components/EmotionPill';
import { SafetyCard } from '../components/SafetyCard';
import {
  CHECKIN_SCRIPT,
  TOTAL_USER_TURNS,
  Turn,
  buildTranscript,
  dwellFor,
} from '../lib/conversation';
import { checkSafety, classifyCrisisSecondary } from '../lib/safety';
import { extractEntrySmart } from '../lib/extraction';
import { currentPosition } from '../lib/phase';
import { getCapabilities, remoteHumeToken } from '../lib/api';
import { EviSession, VoicePhase, VoiceSnapshot } from '../lib/humeVoice';

function FadeLine({ turn }: { turn: { role: 'ai' | 'user'; text: string } }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [a]);
  return (
    <Animated.Text
      style={[
        styles.line,
        turn.role === 'ai' ? styles.aiLine : styles.userLine,
        { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] },
      ]}
    >
      {turn.text}
    </Animated.Text>
  );
}

export function CheckInScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { cycles, entries, addCheckIn } = useApp();

  // Live EVI path (when Hume is configured) vs. scripted fallback path.
  const [live, setLive] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceSnapshot | null>(null);
  const voiceRef = useRef<EviSession | null>(null);

  // Scripted-path state.
  const [phase, setPhase] = useState<VoicePhase>('connecting');
  const [revealed, setRevealed] = useState<Turn[]>([]);
  const [mode, setMode] = useState<RingMode>('ai');
  const [emotion, setEmotion] = useState<Emotion | null>(null);
  const [userTurns, setUserTurns] = useState(0);

  const [safety, setSafety] = useState(false);
  const [note, setNote] = useState('');

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelled = useRef(false);
  const closing = useRef(false);
  const playedRef = useRef(0);
  const notesRef = useRef<string[]>([]);

  // Shared check-in context (computed once; cycles are loaded before this screen).
  const pos = currentPosition(cycles);
  const cycleNumber = cycles.length ? cycles[cycles.length - 1].cycleNumber : 1;
  const consentTimestamp = entries[0]?.consentTimestamp ?? new Date().toISOString();

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const scheduleClose = () => {
    if (closing.current) return;
    closing.current = true;
    timer.current = setTimeout(() => navigation.goBack(), 1700);
  };

  const triggerSafety = () => {
    clearTimer();
    cancelled.current = true;
    voiceRef.current?.dispose();
    setMode('idle');
    setSafety(true); // PRD Feature 5: conversation stops, nothing stored
  };

  // Secondary safety layer — PRD 5.5. The hard-coded RegExp (checkSafety) has already
  // run synchronously on this text; this async Anthropic Haiku classifier only catches
  // nuanced phrasing the RegExp missed. No-op when the backend is absent.
  const runSecondarySafety = (text: string) => {
    classifyCrisisSecondary(text)
      .then((flagged) => {
        if (flagged && !cancelled.current) triggerSafety();
      })
      .catch(() => {});
  };

  // --- Scripted path (no Hume key configured) ---
  const finishScripted = async () => {
    clearTimer();
    cancelled.current = true;
    setMode('idle');
    setEmotion(null);
    const played = CHECKIN_SCRIPT.slice(0, playedRef.current);
    const transcript = buildTranscript(played, notesRef.current);

    // Backend extraction (GPT-5.4 Mini) with on-device fallback — PRD 5.2.
    const entry = await extractEntrySmart({
      transcript,
      cycleDay: pos.cycleDay,
      cycleNumber,
      consentTimestamp,
      // EVI 3 prosody snapshot — moderate distress, below the safety threshold (PRD 5.6)
      emotionSnapshot: { distress: 0.35, sadness: 0.25, fear: 0.05, calmness: 0.3 },
      source: 'voice',
    });
    await addCheckIn(entry);
    setPhase('saved');
    scheduleClose();
  };

  const playStep = (i: number) => {
    if (cancelled.current) return;
    if (i >= CHECKIN_SCRIPT.length) {
      void finishScripted();
      return;
    }
    const turn = CHECKIN_SCRIPT[i];
    if (checkSafety(turn.text)) {
      triggerSafety();
      return;
    }
    playedRef.current = i + 1;
    setRevealed((prev) => [...prev, turn]);
    setMode(turn.role === 'ai' ? 'ai' : 'user');
    setEmotion(turn.role === 'user' ? turn.emotion ?? null : null);
    if (turn.role === 'user') {
      setUserTurns((c) => c + 1);
      runSecondarySafety(turn.text); // async classifier on each user turn (PRD 5.5)
    }
    timer.current = setTimeout(() => playStep(i + 1), dwellFor(turn));
  };

  const startScripted = () => {
    setPhase('connecting');
    timer.current = setTimeout(() => {
      if (cancelled.current) return;
      setPhase('talking');
      playStep(0);
    }, 1300);
  };

  // Decide the path on mount: live EVI when the backend has Hume keys AND we can mint
  // a token (key never touches the device — Constraint #7); scripted otherwise. Any
  // failure to obtain a token falls through to the scripted demo so it never blocks.
  useEffect(() => {
    let active = true;
    cancelled.current = false;
    (async () => {
      const caps = await getCapabilities();
      if (!active) return;
      if (caps.hume) {
        const tok = await remoteHumeToken();
        if (!active) return;
        if (tok) {
          const session = new EviSession({
            token: tok.accessToken,
            configId: tok.configId,
            cycleDay: pos.cycleDay,
            cycleNumber,
            consentTimestamp,
            onUpdate: (snap) => {
              if (!active) return;
              setVoiceState(snap);
              if (snap.phase === 'saved') scheduleClose();
            },
            onStored: (entry) => {
              void addCheckIn(entry);
            },
            onSafety: triggerSafety,
          });
          voiceRef.current = session;
          setVoiceState(session.snapshot());
          setLive(true);
          session.start();
          return;
        }
      }
      if (active) startScripted();
    })();
    return () => {
      active = false;
      cancelled.current = true;
      clearTimer();
      voiceRef.current?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmitNote = () => {
    const text = note.trim();
    if (!text) return;
    // Hard-coded safety check on every text input — PRD Feature 5 / Constraint #2.
    if (checkSafety(text)) {
      setNote('');
      triggerSafety();
      return;
    }
    runSecondarySafety(text); // nuanced-crisis classifier on typed input too (PRD 5.5)
    if (live) {
      // Drive the live EVI turn loop with the typed text; EVI echoes it back as a
      // user_message, so the session adds the transcript line itself.
      voiceRef.current?.sendText(text);
      setNote('');
      return;
    }
    notesRef.current = [...notesRef.current, text];
    setRevealed((prev) => [...prev, { role: 'user', text }]);
    setNote('');
  };

  // Unified getters — read live session state or scripted state (mirrors Flutter).
  const curPhase: VoicePhase = live ? voiceState?.phase ?? 'connecting' : phase;
  const curMode: RingMode = live ? voiceState?.mode ?? 'ai' : mode;
  const curTurns = live ? voiceState?.turns ?? [] : revealed;
  const curUserTurns = live ? voiceState?.userTurns ?? 0 : userTurns;
  const curEmotion = curMode === 'ai' ? null : live ? voiceState?.emotion ?? null : emotion;
  const errorMessage = live ? voiceState?.errorMessage ?? null : null;

  const confirmEnd = () => {
    if (curPhase !== 'talking') {
      cancelled.current = true;
      voiceRef.current?.dispose();
      navigation.goBack();
      return;
    }
    // PRD 0.6 — "End check-in? Your progress will be saved."
    if (live) {
      Alert.alert('End check-in?', 'Your progress will be saved.', [
        { text: 'Keep talking', style: 'cancel' },
        {
          text: 'End',
          style: 'destructive',
          onPress: () => {
            void voiceRef.current?.finishAndStore();
          },
        },
      ]);
      return;
    }
    clearTimer();
    cancelled.current = true; // pause autoplay while the dialog is open
    Alert.alert('End check-in?', 'Your progress will be saved.', [
      {
        text: 'Keep talking',
        style: 'cancel',
        onPress: () => {
          cancelled.current = false;
          playStep(playedRef.current); // resume from where we paused
        },
      },
      {
        text: 'End',
        style: 'destructive',
        onPress: () => {
          cancelled.current = false; // finishScripted re-arms its own guards
          if (playedRef.current > 0) void finishScripted();
          else navigation.goBack();
        },
      },
    ]);
  };

  const visible = curTurns.slice(-4);

  return (
    <LinearGradient colors={['#2D1B4E', colors.bgBase]} style={styles.root}>
      {safety && <SafetyCard onClose={() => navigation.goBack()} />}

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={{ flex: 1 }} />
        <EmotionPill emotion={curEmotion} />
        <Pressable hitSlop={12} onPress={confirmEnd} style={styles.close}>
          <X size={22} color={colors.textSecondary} strokeWidth={1.5} />
        </Pressable>
      </View>

      {curPhase === 'connecting' && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accentRose} />
          <Text style={styles.connecting}>{live ? 'Connecting to EVI…' : 'Connecting…'}</Text>
        </View>
      )}

      {curPhase === 'error' && (
        <View style={styles.center}>
          <AlertTriangle size={36} color={colors.accentAmber} strokeWidth={1.5} />
          <Text style={styles.errorText}>{errorMessage ?? 'Voice unavailable'}</Text>
          <Text style={styles.errorHint}>The scripted check-in still works without live voice.</Text>
        </View>
      )}

      {curPhase === 'talking' && (
        <>
          <View style={styles.ringZone}>
            <ListeningRing mode={curMode} />
            <Text style={styles.modeHint}>
              {curMode === 'ai' ? 'CycleSignal is speaking…' : 'Listening…'}
            </Text>
          </View>

          <View style={styles.transcript}>
            {visible.map((t, i) => (
              <FadeLine key={`${curTurns.length}-${i}`} turn={t} />
            ))}
          </View>

          <Text style={styles.turnCounter}>
            Turn {Math.min(curUserTurns || 1, TOTAL_USER_TURNS)} of {TOTAL_USER_TURNS}
          </Text>
        </>
      )}

      {curPhase === 'saved' && (
        <View style={styles.center}>
          <View style={styles.savedCircle}>
            <Check size={40} color={colors.textPrimary} strokeWidth={2} />
          </View>
          <Text style={styles.savedText}>Check-in saved</Text>
          <Text style={styles.savedSub}>Your timeline has been updated.</Text>
        </View>
      )}

      {curPhase === 'talking' && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.inputBar, { paddingBottom: insets.bottom + 10 }]}
        >
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={live ? 'Type to reply…' : "Type how you're feeling instead…"}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            onSubmitEditing={onSubmitNote}
            returnKeyType="send"
          />
          <Pressable onPress={onSubmitNote} style={styles.send} hitSlop={8}>
            <Send size={20} color={colors.accentRose} strokeWidth={1.5} />
          </Pressable>
        </KeyboardAvoidingView>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 },
  close: {},
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 28 },
  connecting: { ...type.body, color: colors.textSecondary },
  errorText: { ...type.body, color: colors.textPrimary, textAlign: 'center' },
  errorHint: { ...type.caption, color: colors.textMuted, textAlign: 'center' },
  ringZone: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  modeHint: { ...type.label, color: colors.textMuted },
  transcript: { paddingHorizontal: 28, minHeight: 140, justifyContent: 'flex-end', gap: 8 },
  line: { ...type.body, textAlign: 'center' },
  aiLine: { color: colors.accentVioletSoft },
  userLine: { color: colors.textPrimary },
  turnCounter: { ...type.caption, color: colors.textMuted, paddingHorizontal: 28, paddingTop: 14 },
  savedCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.accentRoseGlow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.accentRose,
  },
  savedText: { ...type.display, color: colors.textPrimary },
  savedSub: { ...type.body, color: colors.textSecondary },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  input: {
    flex: 1,
    backgroundColor: colors.bgSurface,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 18,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontFamily: fonts.sans400,
    fontSize: 15,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
