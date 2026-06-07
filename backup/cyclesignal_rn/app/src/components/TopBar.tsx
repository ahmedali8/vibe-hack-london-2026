import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Lock, Settings } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

// Persistent top bar — PRD 0.5. 56px, bg-base, no border. Wordmark left; lock + settings right.
export function TopBar({
  onPressLock,
  onPressSettings,
}: {
  onPressLock?: () => void;
  onPressSettings?: () => void;
}) {
  return (
    <View style={styles.bar}>
      <Text style={styles.wordmark}>CycleSignal</Text>
      <View style={styles.icons}>
        <Pressable hitSlop={10} onPress={onPressLock} accessibilityLabel="Privacy controls">
          <Lock size={20} color={colors.textSecondary} strokeWidth={1.5} />
        </Pressable>
        <Pressable hitSlop={10} onPress={onPressSettings} accessibilityLabel="Settings">
          <Settings size={20} color={colors.textSecondary} strokeWidth={1.5} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 56,
    backgroundColor: colors.bgBase,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  wordmark: { fontFamily: fonts.serif, fontSize: 20, color: colors.textPrimary },
  icons: { flexDirection: 'row', gap: 18 },
});
