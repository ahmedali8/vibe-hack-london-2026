import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getProfile, getPlan, getState, saveState, defaultPlan, computePhase,
  type OvaraProfile, type DailyState,
} from '../lib/storage';
import { colors } from '../lib/colors';

const MOODS = [
  { emoji: '🌧️', label: 'Heavy' },
  { emoji: '☁️', label: 'Tender' },
  { emoji: '🌸', label: 'Soft' },
  { emoji: '✨', label: 'Bright' },
  { emoji: '🌞', label: 'Radiant' },
];

function buildInsight(profile: OvaraProfile, state: DailyState, goalMl: number) {
  const waterPct = Math.round((state.waterMl / goalMl) * 100);
  if (state.coffeeCount >= 3) {
    return {
      title: `${state.coffeeCount} coffees today — that's a lot for your cycle.`,
      body: 'Caffeine can rile up cortisol, especially with PCOS or Endo. Maybe try one fewer tomorrow and see how it lands.',
    };
  }
  if (waterPct < 60) {
    return {
      title: `You sipped about ${waterPct}% of your water goal.`,
      body: 'Hydration is a quiet kindness for hormones. Try a glass with each meal tomorrow.',
    };
  }
  return {
    title: 'You showed up for yourself today.',
    body: `Small steady moves matter more than big ones, especially in your ${profile.cycleStatus.toLowerCase()} cycle. Proud of you.`,
  };
}

export default function Reflection() {
  const router = useRouter();
  const [profile, setProfile] = useState<OvaraProfile | null>(null);
  const [state, setState] = useState<DailyState | null>(null);
  const [goalMl, setGoalMl] = useState(2200);
  const [mood, setMood] = useState<string | undefined>();

  useEffect(() => {
    (async () => {
      const p = await getProfile();
      setProfile(p);
      const s = await getState();
      setState(s);
      setMood(s.mood);
      if (p) {
        const pl = (await getPlan()) ?? defaultPlan(p);
        setGoalMl(pl.waterGoalMl);
      }
    })();
  }, []);

  const pickMood = async (m: string) => {
    setMood(m);
    if (!state) return;
    const next = { ...state, mood: m };
    setState(next);
    await saveState(next);
  };

  if (!profile || !state) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}><Text style={styles.loadingText}>…</Text></View>
      </SafeAreaView>
    );
  }

  const phase = computePhase(profile.cycleStartDate);
  const insight = buildInsight(profile, state, goalMl);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>

        <View style={styles.titleBlock}>
          <Text style={styles.section}>Evening reflection</Text>
          <Text style={styles.title}>Rest well, {profile.name}.</Text>
          <Text style={styles.subtitle}>How would you describe your day?</Text>
        </View>

        {/* Mood picker */}
        <View style={styles.moodRow}>
          {MOODS.map((m) => (
            <Pressable
              key={m.label}
              onPress={() => pickMood(m.label)}
              style={({ pressed }) => [styles.moodBtn, pressed && { opacity: 0.75 }]}
            >
              <View style={[styles.moodEmoji, mood === m.label && styles.moodEmojiSelected]}>
                <Text style={{ fontSize: 24 }}>{m.emoji}</Text>
              </View>
              <Text style={[styles.moodLabel, mood !== m.label && { opacity: 0.5 }]}>{m.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Insight card */}
        <View style={styles.insightCard}>
          <Text style={styles.insightMeta}>Today's insight</Text>
          <Text style={styles.insightTitle}>{insight.title}</Text>
          <Text style={styles.insightBody}>{insight.body}</Text>
        </View>

        {/* Tomorrow preview */}
        <Text style={styles.section}>Tomorrow's preview</Text>
        <View style={styles.previewCard}>
          <View style={styles.previewIcon}>
            <Text style={{ fontSize: 22 }}>{phase.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.previewPhase}>{phase.label}</Text>
            <Text style={styles.previewBlurb} numberOfLines={2}>{phase.blurb}</Text>
          </View>
        </View>

        <Pressable
          onPress={() => router.replace('/')}
          style={({ pressed }) => [styles.sleepBtn, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.sleepBtnText}>Sleep well 🌙</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontFamily: 'Nunito_400Regular', color: colors.inkMuted, fontSize: 24 },
  scroll: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },

  backBtn: {
    width: 40, height: 40, borderRadius: 16,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start',
  },
  backArrow: { fontSize: 18, color: colors.inkDim },

  titleBlock: { marginTop: 32, marginBottom: 32 },
  section: { fontFamily: 'Nunito_700Bold', fontSize: 10, color: colors.inkMuted, letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { fontFamily: 'Fraunces_600SemiBold', fontSize: 36, color: colors.ink, marginTop: 8, lineHeight: 44 },
  subtitle: { fontFamily: 'Nunito_400Regular', fontSize: 14, color: colors.inkDim, marginTop: 8 },

  moodRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  moodBtn: { alignItems: 'center', gap: 6 },
  moodEmoji: {
    width: 56, height: 56, borderRadius: 20,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  moodEmojiSelected: {
    backgroundColor: colors.roseMuted,
    borderColor: colors.rose, borderWidth: 2,
  },
  moodLabel: { fontFamily: 'Nunito_700Bold', fontSize: 10, color: colors.inkMuted, letterSpacing: 1, textTransform: 'uppercase' },

  insightCard: {
    backgroundColor: colors.ink, borderRadius: 28, padding: 28, marginBottom: 32,
  },
  insightMeta: { fontFamily: 'Nunito_700Bold', fontSize: 10, color: colors.sage, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 },
  insightTitle: { fontFamily: 'Fraunces_400Regular', fontSize: 20, color: colors.canvas, lineHeight: 28 },
  insightBody: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: 'rgba(254,249,242,0.6)', marginTop: 12, lineHeight: 20 },

  previewCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: colors.lavenderMuted, borderWidth: 1.5, borderColor: colors.lavenderBorder,
    borderRadius: 24, padding: 20, marginTop: 12, marginBottom: 28,
  },
  previewIcon: {
    width: 48, height: 48, borderRadius: 18,
    backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
  },
  previewPhase: { fontFamily: 'Nunito_600SemiBold', fontSize: 15, color: colors.ink },
  previewBlurb: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: colors.inkDim, marginTop: 2, lineHeight: 18 },

  sleepBtn: {
    backgroundColor: colors.ink, borderRadius: 24, paddingVertical: 20, alignItems: 'center',
    shadowColor: colors.ink, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16,
  },
  sleepBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: colors.canvas },
});
