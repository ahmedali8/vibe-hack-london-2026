import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { colors } from '../lib/colors';
import { phaseForDay, type CyclePhase } from '../lib/storage';

const WHEEL_SIZE = 320;
const CENTER = WHEEL_SIZE / 2;
const DAY_RADIUS = 142;
const DAY_DOT = 18;

export const PHASE_STYLE: Record<CyclePhase, { label: string; color: string; border: string; emoji: string }> = {
  menstrual: { label: 'Menstrual', color: colors.rose, border: 'rgba(240,196,190,0.7)', emoji: '🌙' },
  follicular: { label: 'Follicular', color: colors.sage, border: colors.sageBorder, emoji: '🌱' },
  ovulatory: { label: 'Ovulatory', color: colors.lavender, border: colors.lavenderBorder, emoji: '✨' },
  luteal: { label: 'Luteal', color: colors.amber, border: colors.amberBorder, emoji: '🌸' },
};

function pointOnCircle(index: number, step: number, radius: number) {
  const angle = (-90 + index * step) * (Math.PI / 180);
  return { x: CENTER + radius * Math.cos(angle), y: CENTER + radius * Math.sin(angle) };
}

type Props = {
  rotation: SharedValue<number>;
  selectedDay: number;
  todayDay: number;
  cycleLength: number;
  periodLength: number;
};

export function CycleWheel({ rotation, selectedDay, todayDay, cycleLength, periodLength }: Props) {
  const dialStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const step = 360 / cycleLength;
  const selectedPhase = PHASE_STYLE[phaseForDay(selectedDay, cycleLength, periodLength)];

  return (
    <View style={styles.wrapper}>
      {/* Fixed pointer marking the selected day at the top */}
      <View style={styles.pointer}>
        <Text style={styles.pointerArrow}>▾</Text>
      </View>

      {/* Rotating dial */}
      <Animated.View style={[styles.dial, dialStyle]}>
        {Array.from({ length: cycleLength }, (_, i) => {
          const day = i + 1;
          const style = PHASE_STYLE[phaseForDay(day, cycleLength, periodLength)];
          const pos = pointOnCircle(i, step, DAY_RADIUS);
          const isToday = day === todayDay;
          const isSelected = day === selectedDay;
          return (
            <View
              key={`day-${day}`}
              style={[
                styles.dayDot,
                { left: pos.x - DAY_DOT / 2, top: pos.y - DAY_DOT / 2, backgroundColor: style.color, borderColor: style.border },
                isToday && styles.dayDotToday,
                isSelected && styles.dayDotSelected,
              ]}
            >
              {isSelected && <Text style={styles.dayNum}>{day}</Text>}
            </View>
          );
        })}
      </Animated.View>

      {/* Fixed center summary (does not rotate) */}
      <View style={styles.center} pointerEvents="none">
        <Text style={styles.centerEmoji}>{selectedPhase.emoji}</Text>
        <Text style={styles.centerDay}>Day {selectedDay} of {cycleLength}</Text>
        <Text style={styles.centerPhase}>{selectedPhase.label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    alignSelf: 'center',
  },
  dial: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
  },
  pointer: {
    position: 'absolute',
    top: -6,
    left: CENTER - 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  pointerArrow: {
    fontSize: 24,
    color: colors.ink,
    lineHeight: 24,
  },
  dayDot: {
    position: 'absolute',
    width: DAY_DOT,
    height: DAY_DOT,
    borderRadius: DAY_DOT / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotToday: {
    borderColor: colors.ink,
    borderWidth: 2,
  },
  dayDotSelected: {
    transform: [{ scale: 1.22 }],
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    borderColor: colors.ink,
    borderWidth: 2.5,
  },
  dayNum: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 9,
    color: colors.ink,
  },
  center: {
    position: 'absolute',
    left: CENTER - 80,
    top: CENTER - 60,
    width: 160,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerEmoji: {
    fontSize: 44,
    marginBottom: 6,
  },
  centerDay: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: colors.inkMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  centerPhase: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    color: colors.ink,
    marginTop: 2,
    textAlign: 'center',
  },
});
