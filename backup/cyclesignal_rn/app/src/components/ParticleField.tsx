import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions, AccessibilityInfo } from 'react-native';

// Star-field — PRD 0.5. 12 small white dots drifting at varying opacity/speed.
// Respects reduced motion (PRD 0.10): static dots when reduced motion is on.
const DOTS = Array.from({ length: 12 }, (_, i) => ({
  key: i,
  left: (i * 83) % 100, // pseudo-random spread, %
  top: (i * 47) % 100,
  size: 1.5 + ((i * 7) % 3),
  baseOpacity: 0.12 + ((i % 4) * 0.06),
  duration: 4000 + (i % 5) * 1200,
}));

export function ParticleField() {
  const { width, height } = useWindowDimensions();
  const reduced = useRef(false);
  const anims = useRef(DOTS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((r) => {
      reduced.current = r;
      if (r || cancelled) return;
      DOTS.forEach((d, i) => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(anims[i], {
              toValue: 1,
              duration: d.duration,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(anims[i], {
              toValue: 0,
              duration: d.duration,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        ).start();
      });
    });
    return () => {
      cancelled = true;
    };
  }, [anims]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {DOTS.map((d, i) => (
        <Animated.View
          key={d.key}
          style={{
            position: 'absolute',
            left: (d.left / 100) * width,
            top: (d.top / 100) * height,
            width: d.size,
            height: d.size,
            borderRadius: d.size,
            backgroundColor: '#FFFFFF',
            opacity: anims[i].interpolate({
              inputRange: [0, 1],
              outputRange: [d.baseOpacity, d.baseOpacity + 0.25],
            }),
            transform: [
              {
                translateY: anims[i].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -8],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}
