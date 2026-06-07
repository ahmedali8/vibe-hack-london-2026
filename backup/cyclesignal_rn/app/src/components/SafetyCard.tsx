import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ShieldAlert, X } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { fonts, type } from '../theme/typography';
import { SAFETY_COPY, SAFETY_RESOURCES } from '../lib/safety';

// Safety card — PRD Feature 5. Exact, hard-coded copy and numbers (Constraint #10).
// Shown full-screen the instant the deterministic check fires. Not AI-generated.
export function SafetyCard({ onClose }: { onClose: () => void }) {
  return (
    <View style={styles.overlay}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <View style={styles.header}>
            <ShieldAlert size={28} color={colors.safetyRed} strokeWidth={1.5} />
            <Pressable hitSlop={12} onPress={onClose} accessibilityLabel="Close">
              <X size={22} color={colors.textSecondary} strokeWidth={1.5} />
            </Pressable>
          </View>

          <Text style={styles.headline}>{SAFETY_COPY.headline}</Text>
          <Text style={styles.body}>{SAFETY_COPY.body}</Text>

          <View style={styles.resources}>
            {SAFETY_RESOURCES.map((r) => (
              <Pressable
                key={r.name}
                style={styles.resourceRow}
                onPress={() => Linking.openURL(`tel:${r.tel}`)}
              >
                <Text style={styles.resourceName}>{r.name}</Text>
                <Text style={styles.resourceDetail}>{r.detail}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.footer}>{SAFETY_COPY.footer}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(13,11,26,0.96)',
    zIndex: 1000,
  },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.safetyRed,
    padding: 24,
    // Red tint over surface (PRD 0.11 safety card)
    shadowColor: colors.safetyRed,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headline: { ...type.title, color: colors.textPrimary, marginBottom: 12 },
  body: { ...type.body, color: colors.textSecondary, marginBottom: 16 },
  resources: { gap: 14, marginBottom: 18 },
  resourceRow: {
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    padding: 14,
  },
  resourceName: { fontFamily: fonts.sans600, fontSize: 15, color: colors.accentRose, marginBottom: 2 },
  resourceDetail: { ...type.label, color: colors.textSecondary },
  footer: { ...type.caption, color: colors.textMuted },
});
