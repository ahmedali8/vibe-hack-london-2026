import { useEffect, useState, useRef } from 'react';
import {
  View, Text, Image, ScrollView, Pressable, StyleSheet, Animated,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getProfile, getPlan, getState, saveState, savePlan, defaultPlan, computePhase,
  type OvaraProfile, type DailyPlan, type DailyState,
} from '../lib/storage';
import { colors } from '../lib/colors';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<OvaraProfile | null>(null);
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [state, setState] = useState<DailyState | null>(null);
  const waterAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      const p = await getProfile();
      if (!p) { router.replace('/onboarding'); return; }
      setProfile(p);
      let pl = await getPlan();
      if (!pl) { pl = defaultPlan(p); await savePlan(pl); }
      setPlan(pl);
      const s = await getState();
      setState(s);
    })();
  }, []);

  useEffect(() => {
    if (!plan || !state) return;
    const pct = Math.min(1, state.waterMl / plan.waterGoalMl);
    Animated.timing(waterAnim, { toValue: pct, duration: 600, useNativeDriver: false }).start();
  }, [state?.waterMl, plan?.waterGoalMl]);

  const addWater = async () => {
    if (!state) return;
    const next = { ...state, waterMl: state.waterMl + 250 };
    setState(next);
    await saveState(next);
  };

  const addCoffee = async () => {
    if (!state) return;
    const next = { ...state, coffeeCount: state.coffeeCount + 1 };
    setState(next);
    await saveState(next);
  };

  if (!profile || !plan || !state) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}><Text style={styles.loadingText}>…</Text></View>
      </SafeAreaView>
    );
  }

  const phaseInfo = computePhase(profile.cycleStartDate);
  const waterPct = Math.min(100, Math.round((state.waterMl / plan.waterGoalMl) * 100));
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dateLabel}>{today}</Text>
            <Text style={styles.greeting}>{greeting()}, {profile.name} ✨</Text>
            <Text style={styles.greetingSub}>Here's your soft start to the day.</Text>
          </View>
          <Link href="/reflection" asChild>
            <Pressable style={styles.moonBtn}>
              <Text style={{ fontSize: 22 }}>🌙</Text>
            </Pressable>
          </Link>
        </View>

        {/* Cycle phase */}
        <View style={styles.phaseCard}>
          <Image source={require('../assets/phase-orb.png')} style={styles.orbImage} resizeMode="contain" />
          <Text style={styles.phaseLabel}>Current phase · day {phaseInfo.dayOfCycle}</Text>
          <Text style={styles.phaseName}>{phaseInfo.label} {phaseInfo.emoji}</Text>
          <Text style={styles.phaseBlurb}>{phaseInfo.blurb}</Text>
        </View>

        {/* Diet card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardMeta}>Today's nourishment</Text>
              <Text style={styles.cardTitle}>Anti-inflammatory plan</Text>
            </View>
            <Text style={{ fontSize: 28 }}>🥗</Text>
          </View>
          {plan.meals.map((m) => (
            <View key={m.id} style={styles.mealRow}>
              <View style={styles.mealIcon}><Text style={{ fontSize: 18 }}>{m.emoji}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mealLabel}>{m.label}</Text>
                <Text style={styles.mealTitle} numberOfLines={1}>{m.title}</Text>
                <Text style={styles.mealNote} numberOfLines={1}>{m.note}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Workout card */}
        <View style={[styles.card, { backgroundColor: colors.sageMuted, borderColor: colors.sageBorder }]}>
          <View style={styles.workoutRow}>
            <View style={styles.workoutIcon}><Text style={{ fontSize: 26 }}>{plan.workout.emoji}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardMeta}>Movement</Text>
              <Text style={styles.cardTitle}>{plan.workout.title}</Text>
              <Text style={styles.mealNote}>{plan.workout.duration} · {plan.workout.intensity}</Text>
            </View>
          </View>
        </View>

        {/* Hydration */}
        <View style={[styles.card, { backgroundColor: colors.amberMuted, borderColor: colors.amberBorder }]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardMeta}>Hydration</Text>
              <Text style={styles.cardTitle}>
                {(state.waterMl / 1000).toFixed(1)}L of {(plan.waterGoalMl / 1000).toFixed(1)}L
              </Text>
            </View>
            <Text style={styles.waterPct}>{waterPct}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: waterAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
              ]}
            />
          </View>
          <View style={styles.hydrationBtns}>
            <Pressable onPress={addWater} style={({ pressed }) => [styles.hydrationBtn, { flex: 1 }, pressed && { opacity: 0.75 }]}>
              <Text style={styles.hydrationBtnText}>💧 +250 ml</Text>
            </Pressable>
            <Pressable onPress={addCoffee} style={({ pressed }) => [styles.hydrationBtn, pressed && { opacity: 0.75 }]}>
              <Text style={styles.hydrationBtnText}>☕ {state.coffeeCount}</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating chat button */}
      <Link href="/chat" asChild>
        <Pressable style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}>
          <Text style={{ fontSize: 28 }}>💬</Text>
        </Pressable>
      </Link>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontFamily: 'Nunito_400Regular', color: colors.inkMuted, fontSize: 24 },
  scroll: { paddingHorizontal: 20, paddingTop: 16 },

  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  dateLabel: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: colors.inkMuted, letterSpacing: 1.5, textTransform: 'uppercase' },
  greeting: { fontFamily: 'Fraunces_600SemiBold', fontSize: 28, color: colors.ink, marginTop: 4 },
  greetingSub: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.inkDim, marginTop: 2 },
  moonBtn: {
    width: 44, height: 44, borderRadius: 18,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },

  phaseCard: {
    borderRadius: 32, backgroundColor: colors.lavenderMuted, borderWidth: 1.5, borderColor: colors.lavenderBorder,
    padding: 24, alignItems: 'center', marginBottom: 16, overflow: 'hidden',
  },
  orbImage: { width: 140, height: 140, marginBottom: 8 },
  phaseLabel: { fontFamily: 'Nunito_700Bold', fontSize: 10, color: colors.inkMuted, letterSpacing: 1.5, textTransform: 'uppercase' },
  phaseName: { fontFamily: 'Fraunces_600SemiBold', fontSize: 22, color: colors.ink, marginTop: 4 },
  phaseBlurb: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.inkDim, marginTop: 8, textAlign: 'center', maxWidth: 240, lineHeight: 20 },

  card: {
    borderRadius: 24, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    padding: 20, marginBottom: 16,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  cardMeta: { fontFamily: 'Nunito_700Bold', fontSize: 10, color: colors.inkMuted, letterSpacing: 1.5, textTransform: 'uppercase' },
  cardTitle: { fontFamily: 'Fraunces_400Regular', fontSize: 18, color: colors.ink, marginTop: 2 },

  mealRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  mealIcon: {
    width: 40, height: 40, borderRadius: 14, backgroundColor: colors.roseMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  mealLabel: { fontFamily: 'Nunito_700Bold', fontSize: 10, color: colors.inkMuted, letterSpacing: 1, textTransform: 'uppercase' },
  mealTitle: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: colors.ink, marginTop: 1 },
  mealNote: { fontFamily: 'Nunito_400Regular', fontSize: 11, color: colors.inkMuted, marginTop: 1 },

  workoutRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  workoutIcon: {
    width: 56, height: 56, borderRadius: 20, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },

  waterPct: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.inkDim },
  progressTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 4, overflow: 'hidden', marginBottom: 16 },
  progressFill: { height: '100%', backgroundColor: colors.amber, borderRadius: 4 },
  hydrationBtns: { flexDirection: 'row', gap: 12 },
  hydrationBtn: {
    paddingVertical: 14, paddingHorizontal: 20, borderRadius: 20,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.amberBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  hydrationBtnText: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: colors.ink },

  fab: {
    position: 'absolute', bottom: 32, right: 24,
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.ink, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 20,
    elevation: 12,
  },
});
