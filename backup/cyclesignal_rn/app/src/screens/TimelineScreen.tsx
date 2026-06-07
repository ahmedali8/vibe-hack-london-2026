import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trash2 } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { fonts, type } from '../theme/typography';
import { useApp } from '../context/AppContext';
import { TopBar } from '../components/TopBar';
import { Card } from '../components/Card';
import { Heatmap } from '../components/Heatmap';
import { describeEntry, prettyDate } from '../lib/cycle';

export function TimelineScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { cycles, heatmap, entries, removeEntry } = useApp();

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  const confirmDelete = (id: string) =>
    Alert.alert('Delete this entry?', 'This removes one logged day from your device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeEntry(id) },
    ]);

  return (
    <View style={styles.root}>
      <View style={{ paddingTop: insets.top }}>
        <TopBar
          onPressLock={() => navigation.navigate('Privacy')}
          onPressSettings={() => navigation.navigate('Privacy')}
        />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 16 }}>
        <View>
          <Text style={styles.h1}>Timeline</Text>
          <Text style={styles.sub}>Tap any cell for details</Text>
        </View>

        <Card>
          <Heatmap cycles={cycles} rows={heatmap.rows} maxDay={heatmap.maxDay} />
        </Card>

        <Text style={styles.h2}>History · {entries.length} entries</Text>
        {sorted.length === 0 && (
          <Text style={styles.empty}>No entries yet. Start a check-in to log your first day.</Text>
        )}
        {sorted.map((e) => (
          <Card key={e.id} style={styles.entryCard}>
            <View style={styles.entryHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.entryDate}>{prettyDate(e.date)}</Text>
                <Text style={styles.entryMeta}>
                  Cycle {e.cycleNumber} · Day {e.cycleDay} · {e.source}
                </Text>
              </View>
              <Pressable hitSlop={10} onPress={() => confirmDelete(e.id)}>
                <Trash2 size={18} color={colors.textMuted} strokeWidth={1.5} />
              </Pressable>
            </View>
            {describeEntry(e).map((s, i) => (
              <Text key={i} style={styles.entryLine}>
                • {s}
              </Text>
            ))}
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgBase },
  h1: { ...type.display, color: colors.textPrimary },
  sub: { ...type.label, color: colors.textSecondary, marginTop: 2 },
  h2: { ...type.title, color: colors.textPrimary, marginTop: 4 },
  empty: { ...type.body, color: colors.textMuted },
  entryCard: { padding: 16 },
  entryHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  entryDate: { fontFamily: fonts.sans600, fontSize: 15, color: colors.textPrimary },
  entryMeta: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  entryLine: { ...type.label, color: colors.textSecondary, marginTop: 2 },
});
