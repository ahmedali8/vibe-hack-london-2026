import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getPeriods,
  addPeriodStart,
  setPeriodEnd,
  removePeriod,
  computeCycleStats,
  todayISO,
  addDaysISO,
  type PeriodLog,
} from '../lib/storage';
import { colors } from '../lib/colors';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmt(iso: string): string {
  const d = new Date(iso);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function daysAgoLabel(iso: string): string {
  const today = new Date(todayISO());
  const d = new Date(iso);
  const diff = Math.round((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${diff} days ago`;
}

function periodLength(p: PeriodLog): number | null {
  if (!p.endDate) return null;
  const ms = new Date(p.endDate).getTime() - new Date(p.startDate).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
}

export default function LogPeriod() {
  const router = useRouter();
  const [periods, setPeriods] = useState<PeriodLog[]>([]);
  const [pickDate, setPickDate] = useState(todayISO());

  const refresh = useCallback(async () => {
    setPeriods(await getPeriods());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const stats = computeCycleStats(periods);
  const recent = periods.slice().reverse();
  const latest = recent[0];

  const shiftDay = (delta: number) => {
    const next = addDaysISO(pickDate, delta);
    if (next > todayISO()) return;
    setPickDate(next);
  };

  const save = async () => {
    await addPeriodStart(pickDate);
    setPickDate(todayISO());
    await refresh();
  };

  const markEndedToday = async (startDate: string) => {
    await setPeriodEnd(startDate, todayISO());
    await refresh();
  };

  const remove = async (startDate: string) => {
    await removePeriod(startDate);
    await refresh();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.title}>Log period</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Prediction */}
        {stats.nextPeriodDate && (
          <View style={styles.predictCard}>
            <Text style={styles.predictLabel}>Next period predicted</Text>
            <Text style={styles.predictDate}>{fmt(stats.nextPeriodDate)}</Text>
            <Text style={styles.predictSub}>
              ~{stats.avgCycleLength}-day cycle · ~{stats.avgPeriodLength}-day period
            </Text>
          </View>
        )}

        {/* Date picker */}
        <Text style={styles.sectionLabel}>When did your period start?</Text>
        <View style={styles.stepper}>
          <Pressable onPress={() => shiftDay(-1)} style={styles.stepBtn}>
            <Text style={styles.stepBtnText}>◀</Text>
          </Pressable>
          <View style={styles.stepDateBox}>
            <Text style={styles.stepDate}>{fmt(pickDate)}</Text>
            <Text style={styles.stepDateSub}>{daysAgoLabel(pickDate)}</Text>
          </View>
          <Pressable
            onPress={() => shiftDay(1)}
            style={[styles.stepBtn, pickDate >= todayISO() && { opacity: 0.3 }]}
            disabled={pickDate >= todayISO()}
          >
            <Text style={styles.stepBtnText}>▶</Text>
          </Pressable>
        </View>
        <View style={styles.quickRow}>
          <Pressable onPress={() => setPickDate(todayISO())} style={styles.quickChip}>
            <Text style={styles.quickChipText}>Today</Text>
          </Pressable>
          <Pressable onPress={() => setPickDate(addDaysISO(todayISO(), -1))} style={styles.quickChip}>
            <Text style={styles.quickChipText}>Yesterday</Text>
          </Pressable>
        </View>
        <Pressable onPress={save} style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}>
          <Text style={styles.saveBtnText}>Save period start</Text>
        </Pressable>

        {/* History */}
        <Text style={[styles.sectionLabel, { marginTop: 28 }]}>Your logged periods</Text>
        {recent.length === 0 ? (
          <Text style={styles.empty}>Nothing logged yet. Add your most recent period start above.</Text>
        ) : (
          recent.map((p, idx) => {
            const len = periodLength(p);
            const isLatest = idx === 0;
            return (
              <View key={p.startDate} style={styles.row}>
                <View style={styles.rowDrop}>
                  <Text style={styles.rowDropEmoji}>🩸</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowDate}>{fmt(p.startDate)}</Text>
                  <Text style={styles.rowSub}>
                    {daysAgoLabel(p.startDate)}
                    {len ? ` · ${len}-day period` : ''}
                  </Text>
                  {isLatest && !p.endDate && (
                    <Pressable onPress={() => markEndedToday(p.startDate)} style={styles.endBtn}>
                      <Text style={styles.endBtnText}>Mark ended today</Text>
                    </Pressable>
                  )}
                </View>
                <Pressable onPress={() => remove(p.startDate)} style={styles.removeBtn} hitSlop={8}>
                  <Text style={styles.removeText}>✕</Text>
                </Pressable>
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: 20, color: colors.ink },
  title: { fontFamily: 'Fraunces_600SemiBold', fontSize: 20, color: colors.ink },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },

  predictCard: {
    backgroundColor: colors.lavenderMuted,
    borderWidth: 1.5,
    borderColor: colors.lavenderBorder,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    marginBottom: 24,
  },
  predictLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: colors.inkMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  predictDate: { fontFamily: 'Fraunces_600SemiBold', fontSize: 22, color: colors.ink, marginTop: 4 },
  predictSub: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: colors.inkDim, marginTop: 4 },

  sectionLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: colors.inkMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  stepBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { fontSize: 18, color: colors.ink },
  stepDateBox: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  stepDate: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: colors.ink },
  stepDateSub: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: colors.inkMuted, marginTop: 2 },

  quickRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  quickChip: {
    backgroundColor: colors.roseMuted,
    borderWidth: 1,
    borderColor: 'rgba(240,196,190,0.5)',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  quickChipText: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.ink },

  saveBtn: {
    backgroundColor: colors.ink,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: colors.canvas },

  empty: { fontFamily: 'Nunito_400Regular', fontSize: 14, color: colors.inkMuted, lineHeight: 21 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  rowDrop: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.roseMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowDropEmoji: { fontSize: 18 },
  rowDate: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: colors.ink },
  rowSub: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: colors.inkDim, marginTop: 2 },
  endBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: colors.sageMuted,
    borderWidth: 1,
    borderColor: colors.sageBorder,
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  endBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 12, color: colors.ink },
  removeBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { fontSize: 16, color: colors.inkMuted },
});
