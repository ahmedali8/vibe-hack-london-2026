import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Warm, calm design language inspired by ovara-mobile.
/// Cream canvas + warm-brown ink, soft pastel tones, no gradients or glows.
/// Headings use Fraunces (serif); UI/body uses Nunito (sans).
class AppColors {
  // Surfaces — warm cream canvas, white cards.
  static const bgBase = Color(0xFFFEF9F2); // canvas
  static const bgSurface = Color(0xFFFFFFFF); // cards / panels
  static const bgElevated = Color(0xFFFBF3EA); // subtle elevated fills
  static const borderSubtle = Color(0x143E2C2A); // ~0.08 ink — dividers/borders

  // Ink — warm brown, used at decreasing opacity.
  static const ink = Color(0xFF3E2C2A);
  static const textPrimary = ink;
  static const textSecondary = Color(0x993E2C2A); // ~0.6
  static const textMuted = Color(0x803E2C2A); // ~0.5

  // Soft pastel tones (fills).
  static const rose = Color(0xFFF0C4BE);
  static const lavender = Color(0xFFD4C4E9);
  static const sage = Color(0xFFC8DBC9);
  static const amber = Color(0xFFEDD8A0);

  // Muted pastel backgrounds (chips, soft cards).
  static const roseMuted = Color(0x4DF0C4BE);
  static const lavenderMuted = Color(0x40D4C4E9);
  static const sageMuted = Color(0x40C8DBC9);
  static const amberMuted = Color(0x33EDD8A0);

  // Readable accents (icons, emphasis) — muted, never neon.
  static const accentRose = Color(0xFFC26B62); // emphasis / destructive
  static const accentRoseSoft = Color(0xFFF0C4BE);
  static const accentRoseGlow = Color(0x33F0C4BE);
  static const accentViolet = Color(0xFF8B7BA8); // phase accents
  static const accentVioletSoft = Color(0xFFA89BC4);
  static const accentAmber = Color(0xFFB8923E);
  static const accentBlue = Color(0xFF6B8DB5);
  static const safetyRed = Color(0xFFC0473B);

  // Heatmap cells — calm pastel ramp.
  static const cellNoData = Color(0xFFF1ECE4);
  static const cellMoodLow = Color(0xFFF0C4BE);
  static const cellMoodMid = Color(0xFFE39E94);
  static const cellMoodHigh = Color(0xFFC26B62);
  static const cellPhysical = Color(0xFFD9B96A);
  static const cellBleeding = Color(0xFFB5677A);
  static const premenstrualOverlay = Color(0x148B7BA8);

  // Retained for compatibility; the simplified UI no longer paints gradients.
  static const gradientHero = [bgBase, Color(0xFFFBF1E8), bgSurface];
  static const gradientCta = [ink, ink];

  // PDF document preview.
  static const docWhite = Color(0xFFFFFFFF);
  static const pdfMuted = Color(0xFF6B7280);
  static const pdfBorder = Color(0xFFE5E7EB);
}

class AppRadius {
  static const card = 22.0;
  static const pill = 100.0;
  static const cell = 4.0;
}

/// Fraunces (serif headings) + Nunito (sans UI/body), via google_fonts.
class AppText {
  static TextStyle hero() => GoogleFonts.fraunces(
      fontSize: 52, height: 1.0, fontWeight: FontWeight.w600, color: AppColors.ink);
  static TextStyle display() => GoogleFonts.fraunces(
      fontSize: 28, height: 1.1, fontWeight: FontWeight.w600, color: AppColors.ink);
  static TextStyle serifTitle() => GoogleFonts.fraunces(
      fontSize: 20, fontWeight: FontWeight.w600, color: AppColors.ink);
  static TextStyle title() => GoogleFonts.nunito(
      fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.ink);
  static TextStyle body([Color? c]) => GoogleFonts.nunito(
      fontSize: 15, height: 1.55, color: c ?? AppColors.textSecondary);
  static TextStyle label([Color? c]) => GoogleFonts.nunito(
      fontSize: 13, fontWeight: FontWeight.w600, color: c ?? AppColors.textSecondary);
  static TextStyle caption([Color? c]) =>
      GoogleFonts.nunito(fontSize: 11, color: c ?? AppColors.textMuted);
  /// Small uppercase section label with wide tracking (ovara's overline).
  static TextStyle overline([Color? c]) => GoogleFonts.nunito(
      fontSize: 11,
      fontWeight: FontWeight.w700,
      letterSpacing: 1.5,
      color: c ?? AppColors.textMuted);
  static TextStyle button([Color? c]) => GoogleFonts.nunito(
      fontSize: 15, fontWeight: FontWeight.w700, color: c ?? AppColors.bgBase);
}

ThemeData buildTheme() {
  final base = ThemeData.light(useMaterial3: true);
  return base.copyWith(
    scaffoldBackgroundColor: AppColors.bgBase,
    colorScheme: base.colorScheme.copyWith(
      primary: AppColors.ink,
      secondary: AppColors.accentViolet,
      surface: AppColors.bgSurface,
    ),
    textTheme: GoogleFonts.nunitoTextTheme(base.textTheme),
    splashColor: AppColors.accentRoseGlow,
    highlightColor: Colors.transparent,
  );
}
