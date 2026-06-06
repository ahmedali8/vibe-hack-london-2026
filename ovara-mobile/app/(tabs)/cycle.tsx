import { useEffect, useRef, useState } from 'react';
import { View, Text, Image, ScrollView, Pressable, StyleSheet, Animated } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getProfile, computePhase, type OvaraProfile } from '../../lib/storage';
import { colors } from '../../lib/colors';

const PHASE_META = [
  { key: 'menstrual', label: 'Menstrual', emoji: '🌙', days: 'Days 1-5', color: colors.roseMuted, border: 'rgba(240,196,190,0.5)' },
  { key: 'follicular', label: 'Follicular', emoji: '🌱', days: 'Days 6-13', color: colors.sageMuted, border: colors.sageBorder },
  { key: 'ovulatory', label: 'Ovulatory', emoji: '✨', days: 'Days 14-16', color: colors.lavenderMuted, border: colors.lavenderBorder },
  { key: 'luteal', label: 'Luteal', emoji: '🌸', days: 'Days 17-28', color: colors.amberMuted, border: colors.amberBorder },
];

type PhaseFocus = { eat: string; avoid: string; feel: string };

const PHASE_FOCUS: Record<string, PhaseFocus> = {
  menstrual: {
    eat: 'Iron-rich foods, warm soups, dark chocolate',
    avoid: 'Caffeine, alcohol, salty snacks',
    feel: 'Fatigue, cramps, low energy are normal - rest deeply',
  },
  follicular: {
    eat: 'Fermented foods, leafy greens, eggs',
    avoid: 'Processed foods, excess sugar',
    feel: 'Energy and motivation rise - lean into it gently',
  },
  ovulatory: {
    eat: 'Fibre-rich veg, raw foods, light meals',
    avoid: 'Heavy meals, alcohol',
    feel: "Peak confidence and social energy - you're glowing",
  },
  luteal: {
    eat: 'Complex carbs, magnesium-rich foods, dark veg',
    avoid: 'Caffeine, refined sugar, alcohol',
    feel: 'Cravings and mood swings may appear - be kind to yourself',
  },
};

export default function CycleTab() {
  const [profile, setProfile] = useState<OvaraProfile | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    (async () => setProfile(await getProfile()))();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 2500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}><Text style={styles.loadingText}>...</Text></View>
      </SafeAreaView>
    );
  }

  const phaseInfo = computePhase(profile.cycleStartDate);
  const focus = PHASE_FOCUS[phaseInfo.phase];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Your cycle</Text>
          <Link href="/reflection" asChild>
            <Pressable style={styles.moonBtn}>
              <Text style={{ fontSize: 20 }}>🌙</Text>
            </Pressable>
          </Link>
        </View>

        <View style={styles.orbCard}>
          <Animated.Image
            source={require('../../assets/phase-orb.png')}
            style={[styles.orb, { transform: [{ scale: pulseAnim }] }]}
            resizeMode="contain"
          />
          <Text style={styles.phaseDay}>Day {phaseInfo.dayOfCycle} of 28</Text>
          <Text style={styles.phaseName}>{phaseInfo.label}</Text>
          <Text style={styles.phaseBlurb}>{phaseInfo.blurb}</Text>
        </View>

        <View style={styles.phaseStrip}>
          {PHASE_META.map((p) => (
            <View
              key={p.key}
              style={[
                styles.phaseChip,
                { backgroundColor: p.color, borderColor: p.border },
                phaseInfo.phase === p.key && styles.phaseChipActive,
              ]}
            >
              <Text style={styles.phaseChipEmoji}>{p.emoji}</Text>
              <Text style={styles.phaseChipLabel}>{p.label}</Text>
              <Text style={styles.phaseChipDays}>{p.days}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>This phase focus</Text>

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

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontFamily: 'Fraunces_600SemiBold', fontSize: 32, color: colors.ink },
  moonBtn: {
    width: 44, height: 44, borderRadius: 16,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },

  orbCard: {
    backgroundColor: colors.lavenderMuted, borderWidth: 1.5, borderColor: colors.lavenderBorder,
    borderRadius: 32, padding: 28, alignItems: 'center', marginBottom: 16,
  },
  orb: { width: 130, height: 130, marginBottom: 12 },
  phaseDay: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: colors.inkMuted, letterSpacing: 1.5, textTransform: 'uppercase' },
  phaseName: { fontFamily: 'Fraunces_600SemiBold', fontSize: 24, color: colors.ink, marginTop: 4 },
  phaseBlurb: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.inkDim, marginTop: 8, textAlign: 'center', lineHeight: 20, maxWidth: 260 },

  phaseStrip: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  phaseChip: {
    flex: 1, borderRadius: 16, borderWidth: 1.5, padding: 10,
    alignItems: 'center', opacity: 0.55,
  },
  phaseChipActive: { opacity: 1 },
  phaseChipEmoji: { fontSize: 18 },
  phaseChipLabel: { fontFamily: 'Nunito_700Bold', fontSize: 10, color: colors.ink, marginTop: 2 },
  phaseChipDays: { fontFamily: 'Nunito_400Regular', fontSize: 9, color: colors.inkMuted, marginTop: 1, textAlign: 'center' },

  sectionLabel: {
    fontFamily: 'Nunito_700Bold', fontSize: 11, color: colors.inkMuted,
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12,
  },

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
