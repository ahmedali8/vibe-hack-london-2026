import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Mic } from 'lucide-react-native';
import { colors } from '../theme/colors';

export type RingMode = 'idle' | 'user' | 'ai';

// Animated listening ring — PRD 0.6.
// idle: single rose ring pulsing slowly. user: 3 concentric rose rings expanding.
// ai: violet glow, slower smoother pulse. (Amplitude is simulated — no mic capture.)
export function ListeningRing({ mode }: { mode: RingMode }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    pulse.stopAnimation();
    const duration = mode === 'ai' ? 2600 : mode === 'user' ? 700 : 2000;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [mode, pulse]);

  const ringColor = mode === 'ai' ? colors.accentVioletSoft : colors.accentRose;
  const maxScale = mode === 'user' ? 1.25 : mode === 'ai' ? 1.08 : 1.05;

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, maxScale] });
  const ring2Scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, maxScale + 0.18] });
  const ring3Scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, maxScale + 0.36] });

  return (
    <View style={styles.wrap}>
      {mode === 'user' && (
        <>
          <Animated.View
            style={[styles.ring, { borderColor: ringColor, opacity: 0.15, transform: [{ scale: ring3Scale }] }]}
          />
          <Animated.View
            style={[styles.ring, { borderColor: ringColor, opacity: 0.3, transform: [{ scale: ring2Scale }] }]}
          />
        </>
      )}
      <Animated.View
        style={[
          styles.ring,
          {
            borderColor: ringColor,
            opacity: mode === 'idle' ? 0.5 : 0.85,
            transform: [{ scale }],
            shadowColor: ringColor,
          },
        ]}
      />
      <View style={[styles.core, { backgroundColor: colors.accentRoseGlow }]}>
        <Mic size={36} color={ringColor} strokeWidth={1.5} />
      </View>
    </View>
  );
}

const SIZE = 160;
const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 2,
  },
  core: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
