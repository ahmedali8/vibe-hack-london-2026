import { Pressable, Text, StyleSheet } from 'react-native';
import { colors } from '../lib/colors';

type Tone = 'lavender' | 'rose' | 'sage' | 'amber';

const toneColors: Record<Tone, { bg: string; border: string }> = {
  lavender: { bg: colors.lavenderMuted, border: colors.lavenderBorder },
  rose: { bg: colors.roseMuted, border: 'rgba(240,196,190,0.5)' },
  sage: { bg: colors.sageMuted, border: colors.sageBorder },
  amber: { bg: colors.amberMuted, border: colors.amberBorder },
};

type Props = {
  tone?: Tone;
  selected?: boolean;
  onPress?: () => void;
  children: string;
};

export function Chip({ tone = 'lavender', selected = false, onPress, children }: Props) {
  const tc = toneColors[tone];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? tc.bg : colors.white, borderColor: selected ? tc.border : colors.border },
        pressed && { opacity: 0.75 },
      ]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    marginRight: 8,
    marginBottom: 8,
  },
  label: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: colors.inkMuted,
  },
  labelSelected: {
    color: colors.ink,
  },
});
