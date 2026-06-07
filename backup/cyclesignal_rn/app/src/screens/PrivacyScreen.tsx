import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Lock, ShieldCheck, Trash2 } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { fonts, type } from '../theme/typography';
import { useApp } from '../context/AppContext';
import { TopBar } from '../components/TopBar';
import { Card } from '../components/Card';

export function PrivacyScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { entries, cycles, removeCycle, deleteAllData, withdrawConsent } = useApp();

  const confirmCycle = (n: number) =>
    Alert.alert(`Delete Cycle ${n}?`, 'This removes every entry in that cycle from this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeCycle(n) },
    ]);

  const confirmDeleteAll = () =>
    Alert.alert('Delete all data?', 'This permanently destroys all entries on this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete everything', style: 'destructive', onPress: () => deleteAllData() },
    ]);

  const confirmWithdraw = () =>
    Alert.alert(
      'Withdraw consent?',
      'This deletes all your data and returns the app to the consent screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Withdraw', style: 'destructive', onPress: () => withdrawConsent() },
      ]
    );

  return (
    <View style={styles.root}>
      <View style={{ paddingTop: insets.top }}>
        <TopBar onPressLock={() => {}} onPressSettings={() => {}} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 16 }}>
        <View>
          <Text style={styles.h1}>Privacy</Text>
          <Text style={styles.sub}>Your data lives only on this device.</Text>
        </View>

        <Card style={styles.summaryCard}>
          <View style={styles.summaryHead}>
            <ShieldCheck size={20} color={colors.accentVioletSoft} strokeWidth={1.5} />
            <Text style={styles.summaryTitle}>Data summary</Text>
          </View>
          <Text style={styles.summaryText}>
            {entries.length} entries across {cycles.length} cycles, stored locally on this device.
          </Text>
          <Text style={styles.summaryText}>
            No account. No server. No analytics or trackers. Raw voice audio is never stored.
          </Text>
        </Card>

        <Card>
          <Text style={styles.cardLabel}>Delete a cycle</Text>
          {cycles.length === 0 && <Text style={styles.muted}>No cycles to delete.</Text>}
          {cycles.map((c) => (
            <View key={c.cycleNumber} style={styles.cycleRow}>
              <Text style={styles.cycleLabel}>{c.label}</Text>
              <Pressable hitSlop={10} onPress={() => confirmCycle(c.cycleNumber)}>
                <Trash2 size={18} color={colors.textMuted} strokeWidth={1.5} />
              </Pressable>
            </View>
          ))}
          <Text style={styles.hint}>
            Delete individual days from the Timeline tab.
          </Text>
        </Card>

        <Card>
          <Text style={styles.cardLabel}>Export categories</Text>
          <Text style={styles.muted}>
            Choose exactly which sections appear in your GP pack from the GP Pack tab. The disclaimer
            can never be removed.
          </Text>
        </Card>

        <Card style={styles.warnCard}>
          <View style={styles.summaryHead}>
            <Lock size={18} color={colors.accentAmber} strokeWidth={1.5} />
            <Text style={[styles.summaryTitle, { color: colors.accentAmber }]}>Heads up</Text>
          </View>
          <Text style={styles.summaryText}>
            On some mobile browsers and devices, local data may be cleared if the app is not used for
            a while. Export your GP pack to preserve your records.
          </Text>
        </Card>

        <Pressable style={styles.dangerBtn} onPress={confirmDeleteAll}>
          <Trash2 size={18} color={colors.accentRose} strokeWidth={1.5} />
          <Text style={styles.dangerText}>Delete all data</Text>
        </Pressable>

        <Pressable style={styles.withdrawBtn} onPress={confirmWithdraw}>
          <Text style={styles.withdrawText}>Withdraw consent &amp; reset</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgBase },
  h1: { ...type.display, color: colors.textPrimary },
  sub: { ...type.label, color: colors.textSecondary, marginTop: 2 },
  cardLabel: { ...type.label, color: colors.textSecondary, marginBottom: 10, letterSpacing: 0.3 },
  summaryCard: {},
  summaryHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  summaryTitle: { ...type.title, color: colors.textPrimary },
  summaryText: { ...type.body, color: colors.textSecondary, marginBottom: 6 },
  muted: { ...type.body, color: colors.textMuted },
  cycleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
  },
  cycleLabel: { ...type.body, color: colors.textPrimary },
  hint: { ...type.caption, color: colors.textMuted, marginTop: 8 },
  warnCard: { borderColor: 'rgba(245,158,11,0.4)' },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.accentRose,
    borderRadius: 100,
    paddingVertical: 14,
  },
  dangerText: { fontFamily: fonts.sans600, fontSize: 15, color: colors.accentRose },
  withdrawBtn: { alignItems: 'center', paddingVertical: 8 },
  withdrawText: { ...type.label, color: colors.textMuted, textDecorationLine: 'underline' },
});
