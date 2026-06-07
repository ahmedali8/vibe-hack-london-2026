import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Lock } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { fonts, type } from '../theme/typography';
import { PrimaryButton } from '../components/Button';
import { useApp } from '../context/AppContext';
import { ParticleField } from '../components/ParticleField';

// Consent flow — PRD Feature 6 / Constraint #9. Checkbox unticked by default; Continue
// disabled until ticked (UK GDPR Art. 9(2)(a) explicit consent for health data).
export function ConsentScreen() {
  const insets = useSafeAreaInsets();
  const { grantConsent } = useApp();
  const [checked, setChecked] = useState(false);

  return (
    <LinearGradient colors={colors.gradientHero} style={styles.root}>
      <ParticleField />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <Text style={styles.brand}>CycleSignal AI</Text>
        <Text style={styles.tagline}>
          A private pattern memory that turns scattered symptoms into GP-ready evidence — that you
          control.
        </Text>

        <View style={styles.card}>
          <View style={styles.lockRow}>
            <Lock size={18} color={colors.accentVioletSoft} strokeWidth={1.5} />
            <Text style={styles.cardTitle}>Before you begin</Text>
          </View>
          <Text style={styles.body}>
            CycleSignal stores your cycle and symptom information locally on this device so it can
            show your patterns over time and help you prepare for a clinician.
          </Text>
          <Text style={styles.body}>
            • No account, no server — your data never leaves this device unless you export a GP pack.
            {'\n'}• Raw voice audio is never stored.{'\n'}• You can delete any entry, or everything,
            at any time.
          </Text>

          <Pressable style={styles.checkRow} onPress={() => setChecked((c) => !c)}>
            <View style={[styles.checkbox, checked && styles.checkboxOn]}>
              {checked && <Check size={16} color={colors.textPrimary} strokeWidth={3} />}
            </View>
            <Text style={styles.checkLabel}>
              I understand that CycleSignal AI stores my health information locally on this device and
              that I can delete it at any time.
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              Alert.alert(
                'Privacy notice',
                'CycleSignal AI stores all data locally using on-device storage. It does not transmit data to any server, does not use trackers or analytics, and never stores raw audio. Health data is special category data under UK GDPR; processing here relies on your explicit consent, which you can withdraw at any time to delete all data.'
              )
            }
          >
            <Text style={styles.link}>Read the full privacy notice</Text>
          </Pressable>
        </View>

        <PrimaryButton label="Continue" onPress={grantConsent} disabled={!checked} />
        <Text style={styles.footer}>
          Not a diagnostic tool. Not a medical device. Not a substitute for professional care.
        </Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 22, gap: 16 },
  brand: { fontFamily: fonts.serif, fontSize: 32, color: colors.textPrimary },
  tagline: { ...type.body, color: colors.textSecondary, marginBottom: 8 },
  card: {
    backgroundColor: colors.bgSurface,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { ...type.title, color: colors.textPrimary },
  body: { ...type.body, color: colors.textSecondary },
  checkRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginTop: 4 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.accentRose, borderColor: colors.accentRose },
  checkLabel: { ...type.label, color: colors.textPrimary, flex: 1, lineHeight: 19 },
  link: { ...type.label, color: colors.accentVioletSoft, textDecorationLine: 'underline' },
  footer: { ...type.caption, color: colors.textMuted, textAlign: 'center' },
});
