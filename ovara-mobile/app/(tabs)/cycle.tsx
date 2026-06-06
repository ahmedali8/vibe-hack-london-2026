import { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Animated, Dimensions,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getProfile, computePhase, type OvaraProfile } from '../../lib/storage';
import { colors } from '../../lib/colors';

const { width: SCREEN_W } = Dimensions.get('window');
const RING_SIZE = Math.min(SCREEN_W - 32, 320);
const RING_R = RING_SIZE / 2;
const DOT_ORBIT_R = RING_R - 20;
const TOTAL_DAYS = 28;

function dayToPhase(day: number): 'menstrual' | 'follicular' | 'ovulatory' | 'luteal' {
  if (day <= 5) return 'menstrual';
  if (day <= 13) return 'follicular';
  if (day <= 16) return 'ovulatory';
  return 'luteal';
}

const PHASE_COLORS = {
  menstrual: colors.rose,
  follicular: colors.sage,
  ovulatory: colors.lavender,
  luteal: colors.amber,
};

const PHASE_BG = {
  menstrual: colors.roseMuted,
  follicular: colors.sageMuted,
  ovulatory: colors.lavenderMuted,
  luteal: colors.amberMuted,
};

const PHASE_BORDER = {
  menstrual: 'rgba(240,196,190,0.55)',
  follicular: colors.sageBorder,
  ovulatory: colors.lavenderBorder,
  luteal: colors.amberBorder,
};

const PHASE_META = [
  { key: 'menstrual' as const, label: 'Period', emoji: '🌙', days: 'Days 1–5' },
  { key: 'follicular' as const, label: 'Follicular', emoji: '🌱', days: 'Days 6–13' },
  { key: 'ovulatory' as const, label: 'Ovulation', emoji: '✨', days: 'Days 14–16' },
  { key: 'luteal' as const, label: 'Luteal', emoji: '🌸', days: 'Days 17–28' },
];

const PHASE_FIRST_DAY = { menstrual: 1, follicular: 6, ovulatory: 14, luteal: 17 };

const PHASE_FOCUS = {
  menstrual: {
    energy: 'Low energy — honour your body',
    eat: 'Iron-rich foods, warm soups, dark chocolate',
    avoid: 'Caffeine, alcohol, salty snacks',
    feel: 'Fatigue and cramps are normal — rest deeply and without guilt',
  },
  follicular: {
    energy: 'Building energy — lean in gently',
    eat: 'Fermented foods, leafy greens, eggs',
    avoid: 'Processed foods, excess sugar',
    feel: 'Your energy and motivation are rising — a great time to start new things',
  },
  ovulatory: {
    energy: 'Peak energy — you are glowing',
    eat: 'Fibre-rich veg, raw foods, light meals',
    avoid: 'Heavy meals, alcohol',
    feel: 'Peak confidence and social energy — embrace connection and creativity',
  },
  luteal: {
    energy: 'Winding down — be kind to yourself',
    eat: 'Complex carbs, magnesium foods, dark leafy veg',
    avoid: 'Caffeine, refined sugar, alcohol',
    feel: 'Cravings and mood shifts may appear — self-compassion is your superpower',
  },
};

type PhaseKey = keyof typeof PHASE_FOCUS;

export default function CycleTab() {
  const [profile, setProfile] = useState<OvaraProfile | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => setProfile(await getProfile()))();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 2800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2800, useNativeDriver: true }),
      ])
    ).start();
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}><Text style={styles.loadingText}>...</Text></View>
      </SafeAreaView>
    );
  }

  const phaseInfo = computePhase(profile.cycleStartDate);
  const todayDay = phaseInfo.dayOfCycle;
  const activeDay = selectedDay ?? todayDay;
  const activePhase: PhaseKey = dayToPhase(activeDay);
  const activeMeta = PHASE_META.find(p => p.key === activePhase)!;
  const focus = PHASE_FOCUS[activePhase];

  const tapDot = (day: number) => {
    setSelectedDay(prev => (prev === day || (prev === null && day === todayDay)) ? null : day);
  };

  const jumpToPhase = (phaseKey: PhaseKey) => {
    const first = PHASE_FIRST_DAY[phaseKey];
    setSelectedDay(first === todayDay ? null : first);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Your Cycle</Text>
            <Text style={styles.subtitle}>{phaseInfo.label} phase</Text>
          </View>
          <Link href="/reflection" asChild>
            <Pressable style={styles.moonBtn}>
              <Text style={{ fontSize: 20 }}>🌙</Text>
            </Pressable>
          </Link>
        </View>

        {/* Circular ring */}
        <View style={styles.ringWrapper}>
          <View style={[styles.ring, { width: RING_SIZE, height: RING_SIZE }]}>

            {/* 28 phase dots */}
            {Array.from({ length: TOTAL_DAYS }, (_, i) => {
              const day = i + 1;
              const angle = ((day - 1) / TOTAL_DAYS) * 2 * Math.PI - Math.PI / 2;
              const cx = RING_R + Math.cos(angle) * DOT_ORBIT_R;
              const cy = RING_R + Math.sin(angle) * DOT_ORBIT_R;
              const ph = dayToPhase(day);
              const isActive = day === activeDay;
              const isToday = day === todayDay;
              const dotSize = isActive ? 15 : isToday ? 12 : 8;

              return (
                <Pressable
                  key={day}
                  onPress={() => tapDot(day)}
                  hitSlop={8}
                  style={[
                    styles.dot,
                    {
                      width: dotSize,
                      height: dotSize,
                      borderRadius: dotSize / 2,
                      backgroundColor: PHASE_COLORS[ph],
                      left: cx - dotSize / 2,
                      top: cy - dotSize / 2,
                      opacity: isActive ? 1 : isToday ? 0.85 : 0.32,
                    },
                    isToday && !isActive && styles.dotToday,
                  ]}
                />
              );
            })}

            {/* Center orb */}
            <Animated.View
              style={[styles.centerWrap, { transform: [{ scale: pulseAnim }] }]}
            >
              <View
                style={[
                  styles.centerOrb,
                  {
                    backgroundColor: PHASE_BG[activePhase],
                    borderColor: PHASE_BORDER[activePhase],
                    width: RING_SIZE * 0.56,
                    height: RING_SIZE * 0.56,
                    borderRadius: RING_SIZE * 0.28,
                  },
                ]}
              >
                <Text style={styles.orbEmoji}>{activeMeta.emoji}</Text>
                <Text style={styles.orbPhaseLabel}>{activeMeta.label.toUpperCase()}</Text>
                <Text style={styles.orbDay}>Day {activeDay}</Text>
                <Text style={styles.orbOf}>of 28</Text>
              </View>
            </Animated.View>
          </View>

          {/* Back to today */}
          {selectedDay !== null && selectedDay !== todayDay && (
            <Pressable onPress={() => setSelectedDay(null)} style={styles.backToday}>
              <Text style={styles.backTodayText}>Back to today</Text>
            </Pressable>
          )}
        </View>

        {/* Phase pill tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pillsScroll}
          contentContainerStyle={styles.pillsContent}
        >
          {PHASE_META.map(p => {
            const isSelected = activePhase === p.key;
            return (
              <Pressable
                key={p.key}
                onPress={() => jumpToPhase(p.key)}
                style={[
                  styles.pill,
                  {
                    backgroundColor: isSelected ? PHASE_COLORS[p.key] : 'transparent',
                    borderColor: PHASE_COLORS[p.key],
                  },
                ]}
              >
                <Text style={styles.pillEmoji}>{p.emoji}</Text>
                <Text style={[styles.pillLabel, { color: isSelected ? '#fff' : colors.inkDim }]}>
                  {p.label}
                </Text>
                <Text style={[styles.pillDays, { color: isSelected ? 'rgba(255,255,255,0.75)' : colors.inkMuted }]}>
                  {p.days}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Focus section */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.sectionLabel}>{activeMeta.label} insights</Text>

          <View style={[styles.energyRow, { backgroundColor: PHASE_BG[activePhase], borderColor: PHASE_BORDER[activePhase] }]}>
            <Text style={styles.energyEmoji}>{activeMeta.emoji}</Text>
            <Text style={styles.energyText}>{focus.energy}</Text>
          </View>

          <View style={[styles.focusCard, { backgroundColor: colors.sageMuted, borderColor: colors.sageBorder }]}>
            <Text style={styles.focusIcon}>🥗</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.focusTitle}>Eat more</Text>
              <Text style={styles.focusBody}>{focus.eat}</Text>
            </View>
          </View>

          <View style={[styles.focusCard, { backgroundColor: colors.roseMuted, borderColor: 'rgba(240,196,190,0.5)' }]}>
            <Text style={styles.focusIcon}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.focusTitle}>Limit</Text>
              <Text style={styles.focusBody}>{focus.avoid}</Text>
            </View>
          </View>

          <View style={[styles.focusCard, { backgroundColor: colors.lavenderMuted, borderColor: colors.lavenderBorder }]}>
            <Text style={styles.focusIcon}>💭</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.focusTitle}>How you may feel</Text>
              <Text style={styles.focusBody}>{focus.feel}</Text>
            </View>
          </View>
        </Animated.View>

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

  headerRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: 20,
  },
  title: { fontFamily: 'Fraunces_600SemiBold', fontSize: 32, color: colors.ink },
  subtitle: { fontFamily: 'Nunito_400Regular', fontSize: 14, color: colors.inkDim, marginTop: 2 },
  moonBtn: {
    width: 44, height: 44, borderRadius: 16,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },

  ringWrapper: { alignItems: 'center', marginBottom: 20 },
  ring: { position: 'relative' },

  dot: { position: 'absolute' },
  dotToday: { borderWidth: 2, borderColor: colors.ink },

  centerWrap: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  centerOrb: {
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.ink, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 6,
  },
  orbEmoji: { fontSize: 34, marginBottom: 4 },
  orbPhaseLabel: {
    fontFamily: 'Nunito_700Bold', fontSize: 9, color: colors.inkMuted,
    letterSpacing: 2, textTransform: 'uppercase',
  },
  orbDay: { fontFamily: 'Fraunces_600SemiBold', fontSize: 40, color: colors.ink, lineHeight: 46 },
  orbOf: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: colors.inkMuted },

  backToday: {
    marginTop: 12, paddingVertical: 9, paddingHorizontal: 24,
    borderRadius: 20, backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.border,
  },
  backTodayText: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: colors.ink },

  pillsScroll: { marginHorizontal: -20 },
  pillsContent: { paddingHorizontal: 20, gap: 8, paddingBottom: 6 },
  pill: {
    borderRadius: 20, borderWidth: 1.5,
    paddingHorizontal: 16, paddingVertical: 10,
    alignItems: 'center', minWidth: 90,
  },
  pillEmoji: { fontSize: 18, marginBottom: 2 },
  pillLabel: { fontFamily: 'Nunito_700Bold', fontSize: 11, marginTop: 2 },
  pillDays: { fontFamily: 'Nunito_400Regular', fontSize: 9, marginTop: 1 },

  sectionLabel: {
    fontFamily: 'Nunito_700Bold', fontSize: 11, color: colors.inkMuted,
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12, marginTop: 20,
  },

  energyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 20, borderWidth: 1.5, padding: 16, marginBottom: 10,
  },
  energyEmoji: { fontSize: 28 },
  energyText: { fontFamily: 'Fraunces_400Regular', fontSize: 17, color: colors.ink, flex: 1, lineHeight: 25 },

  focusCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    borderRadius: 20, borderWidth: 1.5, padding: 16, marginBottom: 10,
  },
  focusIcon: { fontSize: 24, lineHeight: 30 },
  focusTitle: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.ink, marginBottom: 3 },
  focusBody: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.inkDim, lineHeight: 20 },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.ink, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16,
    elevation: 10,
  },
});
