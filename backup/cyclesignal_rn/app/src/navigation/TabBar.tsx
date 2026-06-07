import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarHeart, FileText, Lock, Mic, ChartColumn, LucideIcon } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { type } from '../theme/typography';

const ICONS: Record<string, LucideIcon> = {
  Today: CalendarHeart,
  Timeline: ChartColumn,
  GPPack: FileText,
  Privacy: Lock,
};
const LABELS: Record<string, string> = {
  Today: 'Today',
  Timeline: 'Timeline',
  GPPack: 'GP Pack',
  Privacy: 'Privacy',
};

// Bottom navigation — PRD 0.5. 4 tabs + an elevated rose Check-In mic in the centre.
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const routes = state.routes;

  const renderTab = (index: number) => {
    const route = routes[index];
    const focused = state.index === index;
    const Icon = ICONS[route.name];
    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
    };
    return (
      <Pressable key={route.key} style={styles.tab} onPress={onPress}>
        {Icon && (
          <Icon
            size={22}
            color={focused ? colors.accentRose : colors.textSecondary}
            strokeWidth={1.5}
          />
        )}
        <Text style={[styles.label, focused && { color: colors.accentRose }]}>
          {LABELS[route.name]}
        </Text>
      </Pressable>
    );
  };

  const openCheckIn = () => {
    const parent = navigation.getParent();
    if (parent) parent.navigate('CheckIn' as never);
    else navigation.navigate('CheckIn' as never);
  };

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom, height: 64 + insets.bottom }]}>
      {renderTab(0)}
      {renderTab(1)}

      {/* Elevated centre Check-In CTA */}
      <View style={styles.centerWrap}>
        <Pressable onPress={openCheckIn} style={({ pressed }) => pressed && { transform: [{ scale: 0.94 }] }}>
          <LinearGradient
            colors={colors.gradientCta}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mic}
          >
            <Mic size={26} color={colors.textPrimary} strokeWidth={2} />
          </LinearGradient>
        </Pressable>
      </View>

      {renderTab(2)}
      {renderTab(3)}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.bgBase,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    alignItems: 'flex-start',
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  label: { ...type.caption, color: colors.textSecondary },
  centerWrap: { width: 72, alignItems: 'center' },
  mic: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22, // elevated above the bar
    shadowColor: colors.accentRose,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
