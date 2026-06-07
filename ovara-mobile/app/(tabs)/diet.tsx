import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Animated, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EditFieldsModal, type EditField } from '../../components/EditFieldsModal';
import { SwipeableCard } from '../../components/SwipeableCard';
import { loadPlanWithLlm } from '../../lib/plan-llm';
import {
  getState, savePlan, saveState,
  type Meal, type OvaraProfile, type DailyPlan, type DailyState,
} from '../../lib/storage';
import { colors } from '../../lib/colors';
import { toCardTitle, toSentenceCase } from '../../lib/format';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DietTab() {
  const [profile, setProfile] = useState<OvaraProfile | null>(null);
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [state, setState] = useState<DailyState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [llmReady, setLlmReady] = useState(false);
  const [llmError, setLlmError] = useState<string | null>(null);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const waterAnim = useRef(new Animated.Value(0)).current;

  const persistPlan = async (next: DailyPlan) => {
    setPlan(next);
    await savePlan(next);
  };

  const openEditMeal = (meal: Meal) => setEditingMeal(meal);

  const saveMealEdit = async (values: Record<string, string>) => {
    if (!plan || !editingMeal) return;
    const nextMeals = plan.meals.map((m) =>
      m.id === editingMeal.id
        ? {
            ...m,
            emoji: values.emoji?.trim() || m.emoji,
            title: values.title?.trim() || m.title,
            note: values.note?.trim() || m.note,
          }
        : m,
    );
    await persistPlan({ ...plan, meals: nextMeals });
    setEditingMeal(null);
  };

  const deleteMeal = async (mealId: string) => {
    if (!plan || plan.meals.length <= 1) return;
    await persistPlan({ ...plan, meals: plan.meals.filter((m) => m.id !== mealId) });
  };

  const mealEditFields: EditField[] = editingMeal
    ? [
        { key: 'emoji', label: 'Emoji', value: editingMeal.emoji },
        { key: 'title', label: 'Title', value: editingMeal.title },
        { key: 'note', label: 'Note', value: editingMeal.note, multiline: true },
      ]
    : [];

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
    setState(await getState());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!plan || !state) return;
    Animated.timing(waterAnim, {
      toValue: Math.min(1, state.waterMl / plan.waterGoalMl),
      duration: 600,
      useNativeDriver: false,
    }).start();
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

  if (loading || !profile || !plan || !state) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.rose} size="large" />
          <Text style={styles.loadingText}>personalizing your nourishment…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const waterPct = Math.min(100, Math.round((state.waterMl / plan.waterGoalMl) * 100));
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.date}>{today}</Text>
          <Text style={styles.greeting}>{greeting()}, {profile.name} ✨</Text>
        </View>

        <View style={styles.aiRow}>
          <Text style={styles.sectionLabel}>Today's nourishment</Text>
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

        {plan.dietInsight ? (
          <View style={styles.insightCard}>
            <Text style={styles.insightBadge}>✨ personalized</Text>
            <Text style={styles.insightText}>{toSentenceCase(plan.dietInsight)}</Text>
          </View>
        ) : null}

        {llmError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{llmError}</Text>
          </View>
        ) : null}

        {plan.meals.map((m) => (
          <SwipeableCard
            key={m.id}
            onEdit={() => openEditMeal(m)}
            onDelete={() => deleteMeal(m.id)}
            canDelete={plan.meals.length > 1}
          >
            <View style={styles.mealCard}>
              <View style={styles.mealIconWrap}>
                <Text style={{ fontSize: 22 }}>{m.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mealLabel}>{m.label}</Text>
                <Text style={styles.mealTitle}>{toCardTitle(m.title)}</Text>
                <Text style={styles.mealNote}>{toSentenceCase(m.note)}</Text>
              </View>
            </View>
          </SwipeableCard>
        ))}

        <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Hydration</Text>
        <View style={[styles.card, { backgroundColor: colors.amberMuted, borderColor: colors.amberBorder }]}>
          <View style={styles.hydrationHeader}>
            <Text style={styles.hydrationAmount}>
              {(state.waterMl / 1000).toFixed(1)}L
              <Text style={styles.hydrationGoal}> of {(plan.waterGoalMl / 1000).toFixed(1)}L</Text>
            </Text>
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
            <Pressable onPress={addWater} style={({ pressed }) => [styles.hydBtn, { flex: 1 }, pressed && { opacity: 0.7 }]}>
              <Text style={styles.hydBtnText}>💧 +250 ml</Text>
            </Pressable>
            <Pressable onPress={addCoffee} style={({ pressed }) => [styles.hydBtn, pressed && { opacity: 0.7 }]}>
              <Text style={styles.hydBtnText}>☕ {state.coffeeCount}</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <EditFieldsModal
        visible={editingMeal !== null}
        title={editingMeal ? `Edit ${editingMeal.label}` : 'Edit meal'}
        fields={mealEditFields}
        onSave={saveMealEdit}
        onClose={() => setEditingMeal(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontFamily: 'Nunito_400Regular', color: colors.inkMuted, fontSize: 14 },
  scroll: { paddingHorizontal: 20, paddingTop: 16 },

  header: { marginBottom: 24 },
  date: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: colors.inkMuted, letterSpacing: 1.5, textTransform: 'uppercase' },
  greeting: { fontFamily: 'Fraunces_600SemiBold', fontSize: 26, color: colors.ink, marginTop: 4 },

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
    backgroundColor: colors.roseMuted, borderRadius: 20, borderWidth: 1,
    borderColor: colors.roseBorder, padding: 16, marginBottom: 16,
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

  mealCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 16,
  },
  mealIconWrap: {
    width: 44, height: 44, borderRadius: 16,
    backgroundColor: colors.roseMuted, alignItems: 'center', justifyContent: 'center',
  },
  mealLabel: { fontFamily: 'Nunito_700Bold', fontSize: 10, color: colors.inkMuted, letterSpacing: 1, textTransform: 'uppercase' },
  mealTitle: { fontFamily: 'Nunito_600SemiBold', fontSize: 15, color: colors.ink, marginTop: 2 },
  mealNote: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: colors.inkMuted, marginTop: 2 },

  card: { borderRadius: 24, borderWidth: 1, padding: 20, marginBottom: 16 },

  hydrationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  hydrationAmount: { fontFamily: 'Fraunces_600SemiBold', fontSize: 22, color: colors.ink },
  hydrationGoal: { fontFamily: 'Nunito_400Regular', fontSize: 14, color: colors.inkDim },
  waterPct: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.inkDim },
  progressTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 4, overflow: 'hidden', marginBottom: 16 },
  progressFill: { height: '100%', backgroundColor: colors.amber, borderRadius: 4 },
  hydrationBtns: { flexDirection: 'row', gap: 10 },
  hydBtn: {
    paddingVertical: 13, paddingHorizontal: 18, borderRadius: 18,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.amberBorder,
    alignItems: 'center',
  },
  hydBtnText: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: colors.ink },
});
