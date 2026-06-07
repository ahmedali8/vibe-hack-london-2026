import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { fonts, type } from '../theme/typography';
import { PatternAnalysis } from '../types';

// AI Pattern Insight card — PRD 0.8 / Feature 3.
export function PatternInsightCard({ pattern }: { pattern: PatternAnalysis }) {
  const hasPattern = pattern.labels.length > 0;
  return (
    <View style={styles.wrap}>
      {/* 3px rose→violet left border */}
      <LinearGradient
        colors={colors.gradientCta}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.leftBorder}
      />
      <View style={styles.content}>
        <View style={styles.labelRow}>
          <Sparkles size={16} color={colors.accentVioletSoft} strokeWidth={1.5} />
          <Text style={styles.label}>AI Pattern Insight</Text>
        </View>

        {hasPattern ? (
          <>
            <Text style={styles.headline}>{pattern.labels[0]}</Text>
            <Text style={styles.body}>{pattern.narrative}</Text>
            {pattern.labels.length > 1 && (
              <View style={styles.chips}>
                {pattern.labels.slice(1).map((l) => (
                  <View key={l} style={styles.chip}>
                    <Text style={styles.chipText}>{l}</Text>
                  </View>
                ))}
              </View>
            )}
            <Text style={styles.timestamp}>Updated just now</Text>
          </>
        ) : (
          <Text style={styles.placeholder}>
            Check in a few more times to see your pattern emerge.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: colors.bgSurface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  leftBorder: { width: 3 },
  content: { flex: 1, padding: 20 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  label: { ...type.label, color: colors.accentVioletSoft, letterSpacing: 0.5 },
  headline: { ...type.title, color: colors.textPrimary, marginBottom: 8 },
  body: { ...type.body, color: colors.textSecondary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  chip: {
    backgroundColor: colors.bgElevated,
    borderRadius: 100,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  chipText: { ...type.caption, color: colors.textSecondary },
  timestamp: { ...type.caption, color: colors.textMuted, marginTop: 14, textAlign: 'right' },
  placeholder: { ...type.body, color: colors.textMuted, fontStyle: 'italic' },
});
