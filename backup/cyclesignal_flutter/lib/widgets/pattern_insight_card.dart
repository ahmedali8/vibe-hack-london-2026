import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../models/pattern.dart';
import 'primitives.dart';

/// Pattern insight — a calm, soft lavender note (no gradients or model badges).
class PatternInsightCard extends StatelessWidget {
  final PatternAnalysis? pattern;
  const PatternInsightCard({super.key, this.pattern});

  @override
  Widget build(BuildContext context) {
    final p = pattern;
    final hasPattern = p != null && p.labels.isNotEmpty;

    return AppCard(
      color: AppColors.lavenderMuted,
      borderColor: AppColors.lavender,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            const Text('✨', style: TextStyle(fontSize: 14)),
            const SizedBox(width: 6),
            Text('PATTERN INSIGHT', style: AppText.overline(AppColors.accentViolet)),
          ]),
          const SizedBox(height: 12),
          if (hasPattern) ...[
            Text(p.labels.first, style: AppText.serifTitle()),
            const SizedBox(height: 8),
            if (p.narrativeModel == 'pending')
              Row(children: [
                const SizedBox(
                    width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2)),
                const SizedBox(width: 8),
                Text('Writing your summary…', style: AppText.body()),
              ])
            else
              Text(p.narrative, style: AppText.body(AppColors.textPrimary)),
            if (p.labels.length > 1) ...[
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: p.labels.skip(1).map((l) {
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppColors.bgSurface,
                      borderRadius: BorderRadius.circular(100),
                      border: Border.all(color: AppColors.borderSubtle),
                    ),
                    child: Text(l, style: AppText.caption(AppColors.textSecondary)),
                  );
                }).toList(),
              ),
            ],
          ] else
            Text('Check in a few more times to see your pattern emerge.',
                style: AppText.body(AppColors.textMuted)),
        ],
      ),
    );
  }
}
