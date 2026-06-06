import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  type SharedValue,
  type AnimatedRef,
} from 'react-native-reanimated';
import { PHASE_STYLE } from './CycleWheel';
import { phaseForDay } from '../lib/storage';
import { colors } from '../lib/colors';

export const TRACK_HEIGHT = 48;
export const DAY_W = 40;
export const CYCLES = 13;
export const MID_CYCLE = Math.floor(CYCLES / 2);

type Props = {
  scrollRef: AnimatedRef<Animated.ScrollView>;
  scrollX: SharedValue<number>;
  width: number;
  selectedDate: Date;
  isToday: boolean;
  todayDay: number;
  cycleLength: number;
  periodLength: number;
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function CalendarBar({
  scrollRef,
  scrollX,
  width,
  selectedDate,
  isToday,
  todayDay,
  cycleLength,
  periodLength,
}: Props) {
  const L = cycleLength;
  const total = CYCLES * L;
  const lead = width / 2 - DAY_W / 2;
  const initialX = (MID_CYCLE * L + (todayDay - 1)) * DAY_W;

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
  });

  const cells = [];
  for (let i = 0; i < total; i++) {
    const day = (i % L) + 1;
    cells.push(
      <View
        key={i}
        style={{
          width: DAY_W,
          height: TRACK_HEIGHT,
          backgroundColor: PHASE_STYLE[phaseForDay(day, L, periodLength)].color,
          borderLeftWidth: day === 1 ? 1 : 0,
          borderLeftColor: colors.white,
        }}
      />
    );
  }

  const dateLabel = `${WEEKDAYS[selectedDate.getDay()]} ${selectedDate.getDate()} ${MONTHS[selectedDate.getMonth()]}`;

  return (
    <View style={[styles.container, { width }]}>
      <View style={styles.dateRow}>
        <Text style={styles.dateText}>{dateLabel}</Text>
        {isToday && <Text style={styles.todayDot}>· Today</Text>}
      </View>

      <View style={[styles.trackOuter, { width }]}>
        <View style={[styles.trackClip, { width, height: TRACK_HEIGHT }]}>
          <Animated.ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: lead }}
            contentOffset={{ x: initialX, y: 0 }}
            snapToInterval={DAY_W}
            decelerationRate="fast"
            scrollEventThrottle={16}
            onScroll={scrollHandler}
          >
            <View style={styles.row}>{cells}</View>
          </Animated.ScrollView>
        </View>

        {/* Fixed center marker (playhead) */}
        <View style={styles.marker} pointerEvents="none">
          <View style={styles.markerCapTop} />
          <View style={styles.markerLine} />
          <View style={styles.markerCapBottom} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    alignItems: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 10,
  },
  dateText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: colors.ink,
    letterSpacing: 0.5,
  },
  todayDot: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: colors.sage,
  },
  trackOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
  },
  trackClip: {
    borderRadius: TRACK_HEIGHT / 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
  },
  marker: {
    position: 'absolute',
    left: '50%',
    marginLeft: -7,
    width: 14,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  markerLine: {
    flex: 1,
    width: 3,
    backgroundColor: colors.ink,
  },
  markerCapTop: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.ink,
    borderWidth: 3,
    borderColor: colors.white,
  },
  markerCapBottom: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.ink,
    borderWidth: 3,
    borderColor: colors.white,
  },
});
