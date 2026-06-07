import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CalendarX } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { fonts, type } from '../theme/typography';
import { Cell, Cycle, describeEntry, prettyDate } from '../lib/cycle';

const CELL = 14;
const GAP = 2;
const STEP = CELL + GAP;
const LABEL_W = 84;
const ROW_H = STEP;

// Cycle Timeline heatmap — PRD Feature 2 / Section 0.7.
export function Heatmap({
  cycles,
  rows,
  maxDay,
}: {
  cycles: Cycle[];
  rows: Cell[][];
  maxDay: number;
}) {
  const [selected, setSelected] = useState<Cell | null>(null);

  if (cycles.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No cycles tracked yet.</Text>
      </View>
    );
  }

  const days = Array.from({ length: maxDay }, (_, i) => i + 1);

  return (
    <View>
      <View style={styles.legendRow}>
        <Legend color={colors.cellBleeding} label="Bleeding" />
        <Legend color={colors.cellMoodHigh} label="Mood 4–5" />
        <Legend color={colors.cellMoodMid} label="Mood 3" />
        <Legend color={colors.cellMoodLow} label="Mood 1–2" />
        <Legend color={colors.cellPhysical} label="Physical" />
      </View>

      <View style={styles.body}>
        {/* Fixed left labels */}
        <View style={{ width: LABEL_W }}>
          <View style={{ height: 16 }} />
          {cycles.map((c) => (
            <View key={c.cycleNumber} style={[styles.rowLabelWrap, { height: ROW_H }]}>
              <Text
                numberOfLines={1}
                style={[styles.rowLabel, c.isIrregular && { color: colors.accentAmber }]}
              >
                Cycle {c.cycleNumber} · {c.length}d
              </Text>
            </View>
          ))}
        </View>

        {/* Scrollable grid */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            {/* Day axis */}
            <View style={[styles.axisRow, { height: 16 }]}>
              {days.map((d) => (
                <View key={d} style={{ width: STEP, alignItems: 'center' }}>
                  {d === 1 || d % 5 === 0 ? <Text style={styles.axisText}>{d}</Text> : null}
                </View>
              ))}
            </View>
            {/* Rows */}
            {rows.map((cells, ri) => (
              <View key={ri} style={{ flexDirection: 'row', height: ROW_H }}>
                {cells.map((cell) => {
                  const bg =
                    cell.category === 'none' && cell.premenstrual
                      ? colors.premenstrualOverlay
                      : cell.color;
                  const isSel =
                    selected?.cycleNumber === cell.cycleNumber &&
                    selected?.cycleDay === cell.cycleDay;
                  return (
                    <Pressable
                      key={cell.cycleDay}
                      onPress={() => setSelected(cell)}
                      style={{ width: STEP, height: STEP, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <View
                        style={[
                          styles.cell,
                          { backgroundColor: bg },
                          cell.premenstrual && styles.premenstrual,
                          isSel && styles.selectedCell,
                        ]}
                      >
                        {cell.hasFunctionalImpact && (
                          <CalendarX size={9} color={colors.bgBase} strokeWidth={2} />
                        )}
                        {cell.safetyFlagged && <View style={styles.safetyDot} />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Tooltip card — PRD 0.7 interaction */}
      {selected && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipTitle}>
            Cycle {selected.cycleNumber} · Day {selected.cycleDay}
          </Text>
          {selected.entry ? (
            <>
              <Text style={styles.tooltipDate}>{prettyDate(selected.entry.date)}</Text>
              {describeEntry(selected.entry).map((s, i) => (
                <Text key={i} style={styles.tooltipLine}>
                  • {s}
                </Text>
              ))}
            </>
          ) : (
            <Text style={styles.tooltipLine}>No data logged on this day.</Text>
          )}
          {selected.premenstrual && (
            <Text style={styles.tooltipPremen}>Within premenstrual window</Text>
          )}
        </View>
      )}
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flexDirection: 'row' },
  empty: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { ...type.body, color: colors.textMuted },
  rowLabelWrap: { justifyContent: 'center' },
  rowLabel: { ...type.caption, color: colors.textSecondary },
  axisRow: { flexDirection: 'row' },
  axisText: { fontFamily: fonts.sans400, fontSize: 9, color: colors.textMuted },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premenstrual: { borderLeftWidth: 1, borderLeftColor: colors.accentViolet },
  selectedCell: { borderWidth: 1.5, borderColor: colors.accentRose },
  safetyDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#7F1D1D' },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendLabel: { ...type.caption, color: colors.textSecondary },
  tooltip: {
    marginTop: 16,
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 14,
  },
  tooltipTitle: { fontFamily: fonts.sans600, fontSize: 15, color: colors.textPrimary },
  tooltipDate: { ...type.caption, color: colors.textSecondary, marginBottom: 6 },
  tooltipLine: { ...type.label, color: colors.textSecondary, marginTop: 2 },
  tooltipPremen: { ...type.caption, color: colors.accentVioletSoft, marginTop: 8 },
});
