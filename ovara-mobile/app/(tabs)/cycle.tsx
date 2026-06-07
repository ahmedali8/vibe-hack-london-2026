import { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useFocusEffect } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  useSharedValue,
  useDerivedValue,
  useAnimatedReaction,
  useAnimatedRef,
  scrollTo,
  runOnJS,
  runOnUI,
} from 'react-native-reanimated';
import {
  getProfile,
  getPeriods,
  computeCycleStats,
  computePhase,
  phaseForDay,
  getCachedTasks,
  saveCachedTasks,
  todayISO,
  type OvaraProfile,
  type DailyTask,
} from '../../lib/storage';
import { colors } from '../../lib/colors';
import { CycleWheel, PHASE_STYLE } from '../../components/CycleWheel';
import { CalendarBar, DAY_W, CYCLES, MID_CYCLE } from '../../components/CalendarBar';
import { dayStatus } from '../../lib/dayStatus';
import { getDailyTasks } from '../../lib/glm';

// Shown silently if AI to-dos can't be fetched — we never surface an error in the UI.
const DEFAULT_TASKS: DailyTask[] = [
  { emoji: '💧', task: 'Sip water through the day' },
  { emoji: '🌿', task: 'A gentle 10-minute walk' },
  { emoji: '😌', task: 'Three slow breaths, unhurried' },
];
import type Animated from 'react-native-reanimated';

const WHEEL_CENTER = 160;

export default function CycleTab() {
  const { width } = useWindowDimensions();
  const [profile, setProfile] = useState<OvaraProfile | null>(null);
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [todayDay, setTodayDay] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedOffset, setSelectedOffset] = useState(0);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  const scrollX = useSharedValue((MID_CYCLE * 28) * DAY_W);
  const prevAngle = useSharedValue(0);
  const cycleLen = useSharedValue(28);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const todayGlobalIndex = useRef(MID_CYCLE * 28);
  const lenRef = useRef(28);

  // Wheel rotation is derived purely from scroll position: one cycle = one full turn.
  const rotation = useDerivedValue(() => -(scrollX.value / DAY_W) * (360 / cycleLen.value));

  const fetchTasks = useCallback(
    async (p: OvaraProfile, dayOfCycle: number, cLen: number, pLen: number, force = false) => {
      if (!force) {
        const cached = await getCachedTasks();
        if (cached) {
          setTasks(cached.tasks);
          return;
        }
      }
      setTasksLoading(true);
      try {
        const line = dayStatus(dayOfCycle, cLen, pLen).line;
        const phaseLabel = PHASE_STYLE[phaseForDay(dayOfCycle, cLen, pLen)].label;
        const fresh = await getDailyTasks({
          name: p.name,
          dayOfCycle,
          cycleLength: cLen,
          phaseLabel,
          status: line,
          diet: p.diet,
          fitness: p.fitness,
          symptoms: p.symptoms,
        });
        setTasks(fresh);
        await saveCachedTasks({ date: todayISO(), dayOfCycle, tasks: fresh });
      } catch (err) {
        // Silent fallback — never show an error in the UI.
        console.warn('[to-dos] getDailyTasks failed:', err);
        setTasks((prev) => (prev.length ? prev : DEFAULT_TASKS));
      } finally {
        setTasksLoading(false);
      }
    },
    []
  );

  const load = useCallback(async () => {
    const [p, periods] = await Promise.all([getProfile(), getPeriods()]);
    setProfile(p);
    if (!p) return;

    const stats = computeCycleStats(periods);
    const startRef = stats.lastPeriodStart ?? p.cycleStartDate;
    const info = computePhase(startRef, new Date(), stats.avgCycleLength, stats.avgPeriodLength);

    setCycleLength(stats.avgCycleLength);
    setPeriodLength(stats.avgPeriodLength);
    setTodayDay(info.dayOfCycle);
    cycleLen.value = stats.avgCycleLength;
    lenRef.current = stats.avgCycleLength;

    const tgi = MID_CYCLE * stats.avgCycleLength + (info.dayOfCycle - 1);
    todayGlobalIndex.current = tgi;
    setSelectedDay(info.dayOfCycle);
    setSelectedOffset(0);
    scrollX.value = tgi * DAY_W;
    runOnUI((x: number) => {
      'worklet';
      scrollTo(scrollRef, x, 0, false);
    })(tgi * DAY_W);

    fetchTasks(p, info.dayOfCycle, stats.avgCycleLength, stats.avgPeriodLength);
  }, [fetchTasks]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onIndexChange = useCallback((idx: number) => {
    const L = lenRef.current;
    setSelectedOffset(idx - todayGlobalIndex.current);
    setSelectedDay((((idx % L) + L) % L) + 1);
  }, []);

  useAnimatedReaction(
    () => Math.round(scrollX.value / DAY_W),
    (idx, prev) => {
      if (idx !== prev) runOnJS(onIndexChange)(idx);
    }
  );

  const turn = Gesture.Pan()
    .onBegin((e) => {
      prevAngle.value = Math.atan2(e.y - WHEEL_CENTER, e.x - WHEEL_CENTER) * (180 / Math.PI);
    })
    .onUpdate((e) => {
      const cur = Math.atan2(e.y - WHEEL_CENTER, e.x - WHEEL_CENTER) * (180 / Math.PI);
      let delta = cur - prevAngle.value;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      prevAngle.value = cur;
      // Convert wheel rotation into scroll motion (single source of truth).
      const stepDeg = 360 / cycleLen.value;
      const maxX = (CYCLES * cycleLen.value - 1) * DAY_W;
      const nx = Math.max(0, Math.min(maxX, scrollX.value - (delta / stepDeg) * DAY_W));
      scrollTo(scrollRef, nx, 0, false);
    })
    .onEnd(() => {
      const snapped = Math.round(scrollX.value / DAY_W) * DAY_W;
      scrollTo(scrollRef, snapped, 0, true);
    });

  const toggleTask = (idx: number) => {
    setTasks((prev) => {
      const next = prev.map((t, i) => (i === idx ? { ...t, done: !t.done } : t));
      saveCachedTasks({ date: todayISO(), dayOfCycle: todayDay, tasks: next });
      return next;
    });
  };

  const refreshTasks = () => {
    if (profile) fetchTasks(profile, todayDay, cycleLength, periodLength, true);
  };

  const goToToday = () => {
    const x = todayGlobalIndex.current * DAY_W;
    runOnUI((tx: number) => {
      'worklet';
      scrollTo(scrollRef, tx, 0, true);
    })(x);
  };

  if (!profile) {
    return <SafeAreaView style={styles.safe} />;
  }

  const selectedDate = new Date();
  selectedDate.setHours(0, 0, 0, 0);
  selectedDate.setDate(selectedDate.getDate() + selectedOffset);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <GestureDetector gesture={turn}>
          <View>
            <CycleWheel
              rotation={rotation}
              selectedDay={selectedDay}
              todayDay={todayDay}
              cycleLength={cycleLength}
              periodLength={periodLength}
            />
          </View>
        </GestureDetector>

        <View style={styles.barWrap}>
          <CalendarBar
            scrollRef={scrollRef}
            scrollX={scrollX}
            width={width - 48}
            selectedDate={selectedDate}
            isToday={selectedOffset === 0}
            todayDay={todayDay}
            cycleLength={cycleLength}
            periodLength={periodLength}
          />
        </View>

        <Pressable
          onPress={goToToday}
          disabled={selectedOffset === 0}
          style={({ pressed }) => [
            styles.todayBtn,
            selectedOffset === 0 && styles.todayBtnDim,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.todayBtnText}>Back to Today</Text>
        </Pressable>

        {/* AI daily to-dos (GLM) */}
        <View style={styles.todoCard}>
          <View style={styles.todoHeader}>
            <Text style={styles.todoTitle}>Today's gentle to-dos</Text>
            <Pressable onPress={refreshTasks} hitSlop={10} disabled={tasksLoading}>
              <Text style={styles.todoRefresh}>{tasksLoading ? '…' : '↻'}</Text>
            </Pressable>
          </View>

          {tasksLoading && tasks.length === 0 ? (
            <View style={styles.todoLoading}>
              <ActivityIndicator color={colors.inkMuted} />
              <Text style={styles.todoLoadingText}>Tuning to your day…</Text>
            </View>
          ) : (
            tasks.map((t, i) => (
              <Pressable key={i} onPress={() => toggleTask(i)} style={styles.todoRow}>
                <View style={[styles.todoCheck, t.done && styles.todoCheckDone]}>
                  {t.done && <Text style={styles.todoCheckMark}>✓</Text>}
                </View>
                <Text style={styles.todoEmoji}>{t.emoji}</Text>
                <Text style={[styles.todoText, t.done && styles.todoTextDone]}>{t.task}</Text>
              </Pressable>
            ))
          )}
        </View>

        <Link href="/log-period" asChild>
          <Pressable style={({ pressed }) => [styles.logBtn, pressed && { opacity: 0.85 }]}>
            <Text style={styles.logBtnText}>＋ Log period</Text>
          </Pressable>
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  barWrap: {
    width: '100%',
    alignItems: 'center',
  },
  todayBtn: {
    backgroundColor: colors.lavender,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  todayBtnDim: {
    opacity: 0.4,
  },
  todayBtnText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: colors.ink,
    letterSpacing: 0.3,
  },
  todoCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 22,
    padding: 18,
  },
  todoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  todoTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 16,
    color: colors.ink,
  },
  todoRefresh: {
    fontSize: 18,
    color: colors.inkMuted,
    width: 24,
    textAlign: 'center',
  },
  todoLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  todoLoadingText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    color: colors.inkMuted,
  },
  todoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
  },
  todoCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todoCheckDone: {
    backgroundColor: colors.sage,
    borderColor: colors.sage,
  },
  todoCheckMark: {
    fontSize: 12,
    color: colors.ink,
    fontWeight: '700',
  },
  todoEmoji: { fontSize: 18 },
  todoText: {
    flex: 1,
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: colors.ink,
  },
  todoTextDone: {
    color: colors.inkMuted,
    textDecorationLine: 'line-through',
  },
  logBtn: {
    backgroundColor: colors.ink,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  logBtnText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: colors.canvas,
    letterSpacing: 0.3,
  },
});
