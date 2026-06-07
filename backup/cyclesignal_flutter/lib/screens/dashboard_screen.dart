import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../state/app_state.dart';
import '../logic/phase.dart';
import '../logic/cycle.dart';
import '../widgets/primitives.dart';
import '../widgets/cycle_wheel.dart';
import 'checkin_screen.dart';

String _greeting() {
  final h = DateTime.now().hour;
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/// A stable, representative cycle length for the wheel: average of completed
/// cycles (the ongoing one is excluded as its length is still just elapsed days).
int _typicalCycleLength(List<Cycle> cycles) {
  if (cycles.isEmpty) return 28;
  final source =
      cycles.length > 1 ? cycles.sublist(0, cycles.length - 1) : cycles;
  final lengths = source.map((c) => c.length).toList();
  if (lengths.isEmpty) return 28;
  final avg = (lengths.reduce((a, b) => a + b) / lengths.length).round();
  return avg.clamp(21, 40);
}

/// Calm, wheel-first home (PRD 0.5 hero). Detail lives on the Timeline tab.
class DashboardScreen extends StatelessWidget {
  final VoidCallback onOpenPrivacy;
  const DashboardScreen({super.key, required this.onOpenPrivacy});

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final pos = currentPosition(app.cycles);
    final cycleLength = _typicalCycleLength(app.cycles);
    final todayDay = pos.cycleDay.clamp(1, cycleLength);

    return SafeArea(
      bottom: false,
      child: Column(
        children: [
          TopBar(onLock: onOpenPrivacy),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
              children: [
                Text('${_greeting()}, Amara', style: AppText.display()),
                const SizedBox(height: 28),
                CycleWheel(
                  cycleLength: cycleLength,
                  periodLength: 5,
                  todayDay: todayDay,
                ),
                const SizedBox(height: 28),
                PrimaryButton(
                  label: 'Talk to CycleSignal',
                  icon: Icons.mic_none_rounded,
                  fullWidth: true,
                  onPressed: () => openCheckIn(context),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

void openCheckIn(BuildContext context) {
  Navigator.of(context).push(MaterialPageRoute(
    fullscreenDialog: true,
    builder: (_) => const CheckInScreen(),
  ));
}
