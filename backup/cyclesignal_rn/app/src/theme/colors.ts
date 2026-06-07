// Colour palette — PRD Section 0.2. Single source of truth for the dark, rose/violet theme.
export const colors = {
  bgBase: '#0D0B1A', // deep midnight indigo
  bgSurface: '#16132B', // card / panel backgrounds
  bgElevated: '#1E1A35', // modals, tooltips, hover
  borderSubtle: '#2D2850', // card borders, dividers

  textPrimary: '#F0EDF8', // warm off-white
  textSecondary: '#9B93C4', // labels, metadata, timestamps
  textMuted: '#5C5480', // placeholder, disabled

  accentRose: '#E11D48', // primary CTA, active, high severity
  accentRoseSoft: '#FDA4AF', // low severity mood, soft highlights
  accentRoseGlow: 'rgba(225,29,72,0.15)', // mic glow / active ring
  accentViolet: '#7C3AED', // AI insight, gradient midpoint
  accentVioletSoft: '#A78BFA', // AI text, emotion indicator
  accentAmber: '#F59E0B', // irregular cycle warnings, physical cells
  accentBlue: '#3B82F6', // bleeding day cells
  safetyRed: '#DC2626', // safety card tint / border

  // Heatmap cell tokens (PRD 0.7, dark-theme variant)
  cellNoData: '#1E1A35',
  cellMoodLow: '#FDA4AF', // severity 1-2
  cellMoodMid: '#FB7185', // severity 3
  cellMoodHigh: '#E11D48', // severity 4-5
  cellPhysical: '#F59E0B', // physical only
  cellBleeding: '#3B82F6', // bleeding day
  premenstrualOverlay: 'rgba(124,58,237,0.12)',

  // Gradients (used via expo-linear-gradient as colour arrays)
  gradientHero: ['#1E1A35', '#2D1B4E', '#1A0E2E'] as const,
  gradientCta: ['#E11D48', '#7C3AED'] as const,
  heroRadial: ['#2D1B4E', '#0D0B1A'] as const,

  white: '#FFFFFF',
  pdfMuted: '#6B7280',
  pdfBorder: '#E5E7EB',
};

export type Colors = typeof colors;
