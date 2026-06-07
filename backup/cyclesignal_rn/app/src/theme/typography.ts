// Typography — PRD Section 0.3. Two families only: DM Serif Display (hero) + DM Sans (UI).
// Font family keys map to the names registered in App.tsx via @expo-google-fonts.
export const fonts = {
  serif: 'DMSerifDisplay_400Regular',
  serifItalic: 'DMSerifDisplay_400Regular_Italic',
  sans300: 'DMSans_300Light',
  sans400: 'DMSans_400Regular',
  sans500: 'DMSans_500Medium',
  sans600: 'DMSans_600SemiBold',
};

// Type scale tokens (PRD 0.3). Line heights expressed in px for RN.
export const type = {
  hero: { fontFamily: fonts.serif, fontSize: 56, lineHeight: 58 },
  display: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 36 },
  title: { fontFamily: fonts.sans600, fontSize: 20, lineHeight: 24 },
  body: { fontFamily: fonts.sans400, fontSize: 15, lineHeight: 24 },
  label: { fontFamily: fonts.sans500, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.sans400, fontSize: 11, lineHeight: 15 },
} as const;

export const radius = {
  card: 16,
  pill: 100,
  cell: 3,
};

export const spacing = {
  cardPadding: 20,
  screenPadding: 16,
};
