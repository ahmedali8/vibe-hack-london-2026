import React from 'react';
import { StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/typography';

// Card — PRD 0.11. Surface background, subtle border, 16px radius, no drop shadow.
export function Card({ style, children, ...rest }: ViewProps & { style?: ViewStyle | ViewStyle[] }) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSurface,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
  },
});
