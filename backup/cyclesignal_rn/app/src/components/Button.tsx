import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { fonts, radius } from '../theme/typography';

type CTAProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
};

// Primary CTA — PRD 0.11. Rose→violet gradient, fully rounded, scale on press.
export function PrimaryButton({ label, onPress, disabled, icon, style }: CTAProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.ctaWrap,
        style,
        pressed && !disabled && { transform: [{ scale: 0.97 }] },
        disabled && styles.ctaDisabled,
      ]}
    >
      {disabled ? (
        <View style={[styles.cta, styles.ctaDisabledInner]}>
          {icon}
          <Text style={styles.ctaLabel}>{label}</Text>
        </View>
      ) : (
        <LinearGradient
          colors={colors.gradientCta}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cta}
        >
          {icon}
          <Text style={styles.ctaLabel}>{label}</Text>
        </LinearGradient>
      )}
    </Pressable>
  );
}

// Secondary button — PRD 0.11. Transparent, subtle border, pill.
export function SecondaryButton({ label, onPress, icon, style }: CTAProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondary,
        style,
        pressed && { borderColor: colors.accentVioletSoft },
      ]}
    >
      {icon}
      <Text style={styles.secondaryLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ctaWrap: { borderRadius: radius.pill, overflow: 'hidden' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: radius.pill,
  },
  ctaLabel: { color: colors.textPrimary, fontFamily: fonts.sans600, fontSize: 15 },
  ctaDisabled: { opacity: 0.4 },
  ctaDisabledInner: { backgroundColor: colors.bgElevated },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.pill,
    paddingVertical: 12,
    paddingHorizontal: 22,
    backgroundColor: 'transparent',
  },
  secondaryLabel: { color: colors.textSecondary, fontFamily: fonts.sans500, fontSize: 14 },
});
