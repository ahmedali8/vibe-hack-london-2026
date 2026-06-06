import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getProfile, getPlan, savePlan, defaultPlan, computePhase,
  type OvaraProfile, type DailyPlan,
} from '../../lib/storage';
import { colors } from '../../lib/colors';

type Tip = { emoji: string; title: string; body: string };

function phaseTips(phase: string): Tip[] {
  switch (phase) {
    case 'menstrual':
      return [
        { emoji: '🛁', title: 'Warm baths', body: 'Heat helps relax the uterine muscles and ease cramping.' },
        { emoji: '🧘🏻‍♀️', title: 'Gentle yoga', body: "Child's pose and legs-up-the-wall reduce pelvic tension." },
        { emoji: '🚶‍♀️', title: 'Short walks', body: 'Even 10 minutes outside can lift your mood and ease fatigue.' },
      ];
    case 'follicular':
      return [
        { emoji: '🏃‍♀️', title: 'Cardio is your friend', body: 'Rising estrogen boosts endurance — great time for a run.' },
        { emoji: '💪', title: 'Strength training', body: 'Your body responds well to resistance work this week.' },
        { emoji: '🕺', title: 'Try something new', body: 'High energy phase — perfect for a dance class or new sport.' },
      ];
    case 'ovulatory':
      return [
        { emoji: '⚡', title: 'Peak performance', body: "You're at your strongest — push a little harder if it feels good." },
        { emoji: '🏊', title: 'HIIT or swimming', body: "Intense cardio is well-tolerated right now." },
        { emoji: '🤸', title: 'Group classes', body: 'Social energy is high — team workouts feel amazing this phase.' },
      ];
    default:
      return [
        { emoji: '🌿', title: 'Slow it down', body: 'Progesterone rises — your body prefers steady, calmer movement.' },
        { emoji: '🧘', title: 'Pilates or stretching', body: 'Core and flexibility work suits this phase well.' },
        { emoji: '🌙', title: 'Honour rest days', body: "Rest is not laziness — it's recovery. Take it when you need it." },
      ];
  }
}

export default function WorkoutTab() {
  const [profile, setProfile] = useState<OvaraProfile | null>(null);
  const [plan, setPlan] = useState<DailyPlan | null>(null);

  useEffect(() => {
    (async () => {
      const p = await getProfile();
      setProfile(p);
      if (p) {
        let pl = await getPlan();
        if (!pl) { pl = defaultPlan(p); await savePlan(pl); }
        setPlan(pl);
      }
    })();
  }, []);

  if (!profile || !plan) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}><Text style={styles.loadingText}>...</Text></View>
      </SafeAreaView>
    );
  }

  const phaseInfo = computePhase(profile.cycleStartDate);
  const tips = phaseTips(phaseInfo.phase);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Movement</Text>
          <Text style={styles.subtitle}>Tuned for {phaseInfo.label.toLowerCase()} {phaseInfo.emoji}</Text>
        </View>

        <Text style={styles.sectionLabel}>Today's plan</Text>
        <View style={styles.workoutCard}>
          <View style={styles.workoutIconWrap}>
            <Text style={{ fontSize: 32 }}>{plan.workout.emoji}</Text>
          </View>
          <Text style={styles.workoutName}>{plan.workout.title}</Text>
          <View style={styles.workoutMeta}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>⏱ {plan.workout.duration}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>🔥 {plan.workout.intensity}</Text>
            </View>
          </View>
          <Text style={styles.workoutNote}>{plan.workout.note}</Text>
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Movement tips for this phase</Text>
        {tips.map((tip) => (
          <View key={tip.title} style={styles.tipCard}>
            <Text style={styles.tipEmoji}>{tip.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>{tip.title}</Text>
              <Text style={styles.tipBody}>{tip.body}</Text>
            </View>
          </View>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      <Link href="/chat" asChild>
        <Pressable style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}>
          <Text style={{ fontSize: 26 }}>💬</Text>
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

  header: { marginBottom: 24 },
  title: { fontFamily: 'Fraunces_600SemiBold', fontSize: 32, color: colors.ink },
  subtitle: { fontFamily: 'Nunito_400Regular', fontSize: 14, color: colors.inkDim, marginTop: 4 },

  sectionLabel: {
    fontFamily: 'Nunito_700Bold', fontSize: 11, color: colors.inkMuted,
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12,
  },

  workoutCard: {
    backgroundColor: colors.sageMuted, borderRadius: 28, borderWidth: 1.5,
    borderColor: colors.sageBorder, padding: 24, alignItems: 'center', marginBottom: 16,
  },
  workoutIconWrap: {
    width: 72, height: 72, borderRadius: 24, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  workoutName: { fontFamily: 'Fraunces_600SemiBold', fontSize: 24, color: colors.ink, marginBottom: 12 },
  workoutMeta: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  badge: {
    backgroundColor: colors.white, borderRadius: 12, borderWidth: 1,
    borderColor: colors.sageBorder, paddingHorizontal: 14, paddingVertical: 6,
  },
  badgeText: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: colors.ink },
  workoutNote: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.inkDim, textAlign: 'center', lineHeight: 20 },

  tipCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: colors.white, borderRadius: 20, borderWidth: 1,
    borderColor: colors.border, padding: 16, marginBottom: 10,
  },
  tipEmoji: { fontSize: 26, lineHeight: 32 },
  tipTitle: { fontFamily: 'Nunito_600SemiBold', fontSize: 15, color: colors.ink, marginBottom: 2 },
  tipBody: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.inkDim, lineHeight: 20 },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.ink, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16,
    elevation: 10,
  },
});
