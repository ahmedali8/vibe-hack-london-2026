import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../state/app_state.dart';
import '../widgets/primitives.dart';

class PrivacyScreen extends StatelessWidget {
  const PrivacyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();

    return SafeArea(
      bottom: false,
      child: Column(
        children: [
          const TopBar(),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text('Privacy', style: AppText.display()),
                Text('Your data lives only on this device.', style: AppText.label()),
                const SizedBox(height: 16),
                AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [
                        const Icon(Icons.verified_user_outlined,
                            size: 20, color: AppColors.accentViolet),
                        const SizedBox(width: 8),
                        Text('Data summary', style: AppText.title()),
                      ]),
                      const SizedBox(height: 10),
                      Text(
                        '${app.entries.length} entries across ${app.cycles.length} cycles, stored locally on this device.',
                        style: AppText.body(),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'No account. No server-side records. No analytics or trackers. Raw voice audio is never stored.',
                        style: AppText.body(),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('DELETE A CYCLE', style: AppText.overline()),
                      const SizedBox(height: 4),
                      if (app.cycles.isEmpty)
                        Text('No cycles to delete.', style: AppText.body(AppColors.textMuted)),
                      ...app.cycles.map((c) => Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(c.label, style: AppText.body(AppColors.textPrimary)),
                              IconButton(
                                onPressed: () => _confirm(
                                  context,
                                  'Delete ${c.label}?',
                                  'This removes every entry in that cycle from this device.',
                                  () => context.read<AppState>().removeCycle(c.cycleNumber),
                                ),
                                icon: const Icon(Icons.delete_outline,
                                    size: 18, color: AppColors.textMuted),
                              ),
                            ],
                          )),
                      Text('Delete individual days from the Timeline tab.', style: AppText.caption()),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                AppCard(
                  borderColor: const Color(0x66F59E0B),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [
                        const Icon(Icons.info_outline, size: 18, color: AppColors.accentAmber),
                        const SizedBox(width: 8),
                        Text('Heads up', style: AppText.title().copyWith(color: AppColors.accentAmber)),
                      ]),
                      const SizedBox(height: 8),
                      Text(
                        'On some devices, local data may be cleared if the app is not used for a long time. Export your GP pack to preserve your records.',
                        style: AppText.body(),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                OutlinedButton.icon(
                  onPressed: () => _confirm(
                    context,
                    'Delete all data?',
                    'This permanently destroys all entries on this device.',
                    () => context.read<AppState>().deleteAllData(),
                    confirmLabel: 'Delete everything',
                  ),
                  icon: const Icon(Icons.delete_forever, color: AppColors.accentRose),
                  label: Text('Delete all data', style: AppText.button().copyWith(color: AppColors.accentRose)),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(50),
                    side: const BorderSide(color: AppColors.accentRose),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.pill)),
                  ),
                ),
                const SizedBox(height: 8),
                Center(
                  child: TextButton(
                    onPressed: () => _confirm(
                      context,
                      'Withdraw consent?',
                      'This deletes all your data and returns the app to the consent screen.',
                      () => context.read<AppState>().withdrawConsent(),
                      confirmLabel: 'Withdraw',
                    ),
                    child: Text('Withdraw consent & reset',
                        style: AppText.label().copyWith(decoration: TextDecoration.underline)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _confirm(BuildContext context, String title, String body, VoidCallback onYes,
      {String confirmLabel = 'Delete'}) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(title),
        content: Text(body),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          TextButton(
            onPressed: () {
              onYes();
              Navigator.pop(context);
            },
            child: Text(confirmLabel, style: const TextStyle(color: AppColors.accentRose)),
          ),
        ],
      ),
    );
  }
}
