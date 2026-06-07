import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { type } from '../theme/typography';

export type Emotion = 'Calm' | 'Tired' | 'Anxious' | 'Distressed';

const DOT: Record<Emotion, string> = {
  Calm: '#34D399',
  Tired: colors.accentBlue,
  Anxious: colors.accentAmber,
  Distressed: colors.accentRose,
};

// Emotion indicator — PRD 0.6. Top-right pill; fades in only for non-neutral emotion.
export function EmotionPill({ emotion }: { emotion: Emotion | null }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: emotion ? 1 : 0,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [emotion, opacity]);

  if (!emotion) return null;
  return (
    <Animated.View style={[styles.pill, { opacity }]}>
      <View style={[styles.dot, { backgroundColor: DOT[emotion] }]} />
      <Text style={styles.label}>{emotion}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.bgElevated,
    borderRadius: 100,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { ...type.label, color: colors.textSecondary },
});
