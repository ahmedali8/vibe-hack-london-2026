import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import 'dashboard_screen.dart';
import 'timeline_screen.dart';
import 'gp_pack_screen.dart';
import 'privacy_screen.dart';

/// App shell — PRD 0.5 bottom navigation: Today, Timeline, Check-In (elevated rose
/// mic, centre), GP Pack, Privacy.
class RootShell extends StatefulWidget {
  const RootShell({super.key});
  @override
  State<RootShell> createState() => _RootShellState();
}

class _RootShellState extends State<RootShell> {
  int _index = 0;
  void _goPrivacy() => setState(() => _index = 3);

  @override
  Widget build(BuildContext context) {
    final pages = [
      DashboardScreen(onOpenPrivacy: _goPrivacy),
      TimelineScreen(onOpenPrivacy: _goPrivacy),
      GpPackScreen(onOpenPrivacy: _goPrivacy),
      const PrivacyScreen(),
    ];

    return Scaffold(
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: _BottomBar(
        index: _index,
        onTap: (i) => setState(() => _index = i),
        onMic: () => openCheckIn(context),
      ),
    );
  }
}

class _BottomBar extends StatelessWidget {
  final int index;
  final ValueChanged<int> onTap;
  final VoidCallback onMic;
  const _BottomBar({required this.index, required this.onTap, required this.onMic});

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).padding.bottom;
    return Container(
      padding: EdgeInsets.only(bottom: bottomInset + 8, top: 10),
      decoration: const BoxDecoration(
        color: AppColors.bgBase,
        border: Border(top: BorderSide(color: AppColors.borderSubtle)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          _tab(0, Icons.spa_outlined, 'Today'),
          _tab(1, Icons.show_chart, 'Timeline'),
          _micButton(),
          _tab(2, Icons.description_outlined, 'Pack'),
          _tab(3, Icons.lock_outline, 'Privacy'),
        ],
      ),
    );
  }

  Widget _tab(int i, IconData icon, String label) {
    final active = index == i;
    final color = active ? AppColors.ink : AppColors.textMuted;
    return Expanded(
      child: InkWell(
        onTap: () => onTap(i),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 22, color: color),
              const SizedBox(height: 4),
              Text(label,
                  style: AppText.caption(color)
                      .copyWith(fontWeight: active ? FontWeight.w700 : FontWeight.w600)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _micButton() {
    return SizedBox(
      width: 72,
      // Must be height-bounded: inside the bottom bar's Row (which gets an
      // unbounded vertical max), a width-only SizedBox lets its Center child
      // expand to fill the whole screen, collapsing the Scaffold body to 0.
      height: 64,
      child: Center(
        child: GestureDetector(
          onTap: onMic,
          child: Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.ink,
              boxShadow: [
                BoxShadow(
                    color: AppColors.ink.withValues(alpha: 0.18),
                    blurRadius: 14,
                    offset: const Offset(0, 6)),
              ],
            ),
            child: const Icon(Icons.mic_none_rounded, color: AppColors.bgBase, size: 26),
          ),
        ),
      ),
    );
  }
}
