import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../state/app_state.dart';
import '../logic/cycle.dart';
import '../widgets/primitives.dart';
import '../widgets/heatmap_widget.dart';

class TimelineScreen extends StatelessWidget {
  final VoidCallback onOpenPrivacy;
  const TimelineScreen({super.key, required this.onOpenPrivacy});

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final sorted = [...app.entries]..sort((a, b) => b.date.compareTo(a.date));

    return SafeArea(
      bottom: false,
      child: Column(
        children: [
          TopBar(onLock: onOpenPrivacy),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text('Timeline', style: AppText.display()),
                Text('Tap any cell for details', style: AppText.label()),
                const SizedBox(height: 16),
                AppCard(child: HeatmapWidget(cycles: app.cycles, heatmap: app.heatmap)),
                const SizedBox(height: 16),
                Text('History · ${app.entries.length} entries', style: AppText.title()),
                const SizedBox(height: 8),
                if (sorted.isEmpty)
                  Text('No entries yet. Start a check-in to log your first day.',
                      style: AppText.body(AppColors.textMuted)),
                ...sorted.map((e) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: AppCard(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(prettyDate(e.date),
                                          style: AppText.body(AppColors.textPrimary)
                                              .copyWith(fontWeight: FontWeight.w600)),
                                      Text('Cycle ${e.cycleNumber} · Day ${e.cycleDay} · ${e.source}',
                                          style: AppText.caption()),
                                    ],
                                  ),
                                ),
                                IconButton(
                                  onPressed: () => _confirmDelete(context, e.id),
                                  icon: const Icon(Icons.delete_outline,
                                      size: 18, color: AppColors.textMuted),
                                ),
                              ],
                            ),
                            ...describeEntry(e).map((s) => Text('• $s', style: AppText.label())),
                          ],
                        ),
                      ),
                    )),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _confirmDelete(BuildContext context, String id) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete this entry?'),
        content: const Text('This removes one logged day from your device.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          TextButton(
            onPressed: () {
              context.read<AppState>().removeEntry(id);
              Navigator.pop(context);
            },
            child: const Text('Delete', style: TextStyle(color: AppColors.accentRose)),
          ),
        ],
      ),
    );
  }
}
