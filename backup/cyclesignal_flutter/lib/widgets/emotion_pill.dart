import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Emotion indicator — PRD 0.6. Fades in only for a non-neutral emotion.
class EmotionPill extends StatelessWidget {
  final String? emotion;
  const EmotionPill({super.key, this.emotion});

  static const _dot = {
    'Calm': Color(0xFF10B981),
    'Tired': AppColors.accentBlue,
    'Anxious': AppColors.accentAmber,
    'Distressed': AppColors.accentRose,
  };

  @override
  Widget build(BuildContext context) {
    return AnimatedOpacity(
      opacity: emotion == null ? 0 : 1,
      duration: const Duration(milliseconds: 400),
      child: emotion == null
          ? const SizedBox.shrink()
          : Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.bgElevated,
                borderRadius: BorderRadius.circular(100),
                border: Border.all(color: AppColors.borderSubtle),
              ),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                      color: _dot[emotion] ?? AppColors.textMuted, shape: BoxShape.circle),
                ),
                const SizedBox(width: 6),
                Text(emotion!, style: AppText.label()),
              ]),
            ),
    );
  }
}
