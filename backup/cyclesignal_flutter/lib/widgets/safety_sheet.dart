import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/app_theme.dart';
import '../services/safety_service.dart';

/// Safety card — PRD Feature 5. Exact, hard-coded copy and numbers (Constraint #10).
/// Shown the instant the deterministic check fires. Never AI-generated.
Future<void> showSafety(BuildContext context, {VoidCallback? onClose}) {
  return showGeneralDialog(
    context: context,
    barrierDismissible: false,
    barrierColor: AppColors.bgBase.withValues(alpha: 0.96),
    pageBuilder: (_, __, ___) => _SafetyView(onClose: onClose),
  );
}

class _SafetyView extends StatelessWidget {
  final VoidCallback? onClose;
  const _SafetyView({this.onClose});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Container(
              decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2), // red tint over surface
                borderRadius: BorderRadius.circular(16),
                border: const Border(left: BorderSide(color: AppColors.safetyRed, width: 4)),
              ),
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Icon(Icons.shield_outlined, color: AppColors.safetyRed, size: 28),
                      IconButton(
                        onPressed: () {
                          Navigator.of(context).pop();
                          onClose?.call();
                        },
                        icon: const Icon(Icons.close, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(safetyHeadline, style: AppText.title()),
                  const SizedBox(height: 12),
                  Text(safetyBody, style: AppText.body()),
                  const SizedBox(height: 16),
                  ...safetyResources.map((r) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: InkWell(
                          onTap: () => launchUrl(Uri.parse('tel:${r.tel}')),
                          child: Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: AppColors.bgSurface,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppColors.borderSubtle),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(r.name,
                                    style: AppText.body(AppColors.accentRose)
                                        .copyWith(fontWeight: FontWeight.w600)),
                                const SizedBox(height: 2),
                                Text(r.detail, style: AppText.label()),
                              ],
                            ),
                          ),
                        ),
                      )),
                  const SizedBox(height: 4),
                  Text(safetyFooter, style: AppText.caption()),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
