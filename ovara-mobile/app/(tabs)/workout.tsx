import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EditFieldsModal, type EditField } from '../../components/EditFieldsModal';
import { SwipeableCard } from '../../components/SwipeableCard';
import { loadPlanWithLlm } from '../../lib/plan-llm';
import {
  computePhase,
  savePlan,
  type OvaraProfile, type DailyPlan, type Workout, type WorkoutTip,
} from '../../lib/storage';
import { colors } from '../../lib/colors';
import { toCardTitle, toSentenceCase } from '../../lib/format';

function phaseTips(phase: string): WorkoutTip[] {
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
        { emoji: '🏊', title: 'HIIT or swimming', body: 'Intense cardio is well-tolerated right now.' },
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [llmReady, setLlmReady] = useState(false);
  const [llmError, setLlmError] = useState<string | null>(null);
  const [editingTipIndex, setEditingTipIndex] = useState<number | null>(null);
  const [editingWorkout, setEditingWorkout] = useState(false);

  const persistPlan = async (next: DailyPlan) => {
    setPlan(next);
    await savePlan(next);
  };

  const load = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);

    const result = await loadPlanWithLlm(forceRefresh);
    if (result) {
      setProfile(result.profile);
      setPlan(result.plan);
      setLlmReady(result.llmReady);
      setLlmError(result.llmError);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !profile || !plan) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.sage} size="large" />
          <Text style={styles.loadingText}>personalizing your movement…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const phaseInfo = computePhase(profile.cycleStartDate);
  const tips = plan.workoutTips?.length ? plan.workoutTips : phaseTips(phaseInfo.phase);

  const tipsOnPlan = (): WorkoutTip[] =>
    plan.workoutTips?.length ? [...plan.workoutTips] : [...tips];

  const saveTips = async (nextTips: WorkoutTip[]) => {
    if (!plan) return;
    await persistPlan({ ...plan, workoutTips: nextTips });
  };

  const saveTipEdit = async (values: Record<string, string>) => {
    if (!plan || editingTipIndex === null) return;
    const next = tipsOnPlan();
    next[editingTipIndex] = {
      emoji: values.emoji?.trim() || next[editingTipIndex].emoji,
      title: values.title?.trim() || next[editingTipIndex].title,
      body: values.body?.trim() || next[editingTipIndex].body,
    };
    await saveTips(next);
    setEditingTipIndex(null);
  };

  const deleteTip = async (index: number) => {
    const next = tipsOnPlan().filter((_, i) => i !== index);
    await saveTips(next);
  };

  const saveWorkoutEdit = async (values: Record<string, string>) => {
    if (!plan) return;
    const workout: Workout = {
      ...plan.workout,
      emoji: values.emoji?.trim() || plan.workout.emoji,
      title: values.title?.trim() || plan.workout.title,
      duration: values.duration?.trim() || plan.workout.duration,
      intensity: values.intensity?.trim() || plan.workout.intensity,
      note: values.note?.trim() || plan.workout.note,
    };
    await persistPlan({ ...plan, workout });
    setEditingWorkout(false);
  };

  const editingTip = editingTipIndex !== null ? tipsOnPlan()[editingTipIndex] : null;
  const tipEditFields: EditField[] = editingTip
    ? [
        { key: 'emoji', label: 'Emoji', value: editingTip.emoji },
        { key: 'title', label: 'Title', value: editingTip.title },
        { key: 'body', label: 'Body', value: editingTip.body, multiline: true },
      ]
    : [];

  const workoutEditFields: EditField[] = [
    { key: 'emoji', label: 'Emoji', value: plan.workout.emoji },
    { key: 'title', label: 'Title', value: plan.workout.title },
    { key: 'duration', label: 'Duration', value: plan.workout.duration },
    { key: 'intensity', label: 'Intensity', value: plan.workout.intensity },
    { key: 'note', label: 'Note', value: plan.workout.note, multiline: true },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Movement</Text>
          <Text style={styles.subtitle}>Tuned for {phaseInfo.label.toLowerCase()} {phaseInfo.emoji}</Text>
        </View>

        <View style={styles.aiRow}>
          <Text style={styles.sectionLabel}>Today's plan</Text>
          <Pressable
            onPress={() => load(true)}
            disabled={refreshing || !llmReady}
            style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.7 }]}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={colors.ink} />
            ) : (
              <Text style={styles.refreshText}>{llmReady ? '↻ refresh' : 'default plan'}</Text>
            )}
          </Pressable>
        </View>

        {plan.workoutInsight ? (
          <View style={styles.insightCard}>
            <Text style={styles.insightBadge}>✨ personalized</Text>
            <Text style={styles.insightText}>{toSentenceCase(plan.workoutInsight)}</Text>
          </View>
        ) : null}

        {llmError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{llmError}</Text>
          </View>
        ) : null}

        <SwipeableCard
          onEdit={() => setEditingWorkout(true)}
          canDelete={false}
          borderRadius={28}
          backgroundColor={colors.sageMuted}
          borderColor={colors.sageBorder}
        >
          <View style={styles.workoutCard}>
            <View style={styles.workoutIconWrap}>
              <Text style={{ fontSize: 32 }}>{plan.workout.emoji}</Text>
            </View>
            <Text style={styles.workoutName}>{toCardTitle(plan.workout.title)}</Text>
            <View style={styles.workoutMeta}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>⏱ {plan.workout.duration}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>🔥 {toCardTitle(plan.workout.intensity)}</Text>
              </View>
            </View>
            <Text style={styles.workoutNote}>{toSentenceCase(plan.workout.note)}</Text>
          </View>
        </SwipeableCard>

        <Text style={[styles.sectionLabel, { marginTop: 8 }]}>
          {plan.source === 'llm' ? 'AI movement tips' : 'Movement tips for this phase'}
        </Text>
        {tips.map((tip, index) => (
          <SwipeableCard
            key={`${tip.title}-${index}`}
            onEdit={() => setEditingTipIndex(index)}
            onDelete={() => deleteTip(index)}
            canDelete={tips.length > 1}
          >
            <View style={styles.tipCard}>
              <Text style={styles.tipEmoji}>{tip.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.tipTitle}>{toCardTitle(tip.title)}</Text>
                <Text style={styles.tipBody}>{toSentenceCase(tip.body)}</Text>
              </View>
            </View>
          </SwipeableCard>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      <EditFieldsModal
        visible={editingTipIndex !== null}
        title="Edit movement tip"
        fields={tipEditFields}
        onSave={saveTipEdit}
        onClose={() => setEditingTipIndex(null)}
      />
      <EditFieldsModal
        visible={editingWorkout}
        title="Edit today's workout"
        fields={workoutEditFields}
        onSave={saveWorkoutEdit}
        onClose={() => setEditingWorkout(false)}
      />

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
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontFamily: 'Nunito_400Regular', color: colors.inkMuted, fontSize: 14 },
  scroll: { paddingHorizontal: 20, paddingTop: 16 },

  header: { marginBottom: 24 },
  title: { fontFamily: 'Fraunces_600SemiBold', fontSize: 32, color: colors.ink },
  subtitle: { fontFamily: 'Nunito_400Regular', fontSize: 14, color: colors.inkDim, marginTop: 4 },

  aiRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionLabel: {
    fontFamily: 'Nunito_700Bold', fontSize: 11, color: colors.inkMuted,
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  refreshBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
  },
  refreshText: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: colors.inkDim },

  insightCard: {
    backgroundColor: colors.sageMuted, borderRadius: 20, borderWidth: 1,
    borderColor: colors.sageBorder, padding: 16, marginBottom: 16,
  },
  insightBadge: {
    fontFamily: 'Nunito_700Bold', fontSize: 10, color: colors.inkMuted,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8,
  },
  insightText: { fontFamily: 'Nunito_400Regular', fontSize: 14, color: colors.ink, lineHeight: 22 },

  errorCard: {
    backgroundColor: colors.amberMuted, borderRadius: 16, borderWidth: 1,
    borderColor: colors.amberBorder, padding: 12, marginBottom: 12,
  },
  errorText: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: colors.inkDim, lineHeight: 18 },

  workoutCard: {
    padding: 24, alignItems: 'center',
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
    flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 16,
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
