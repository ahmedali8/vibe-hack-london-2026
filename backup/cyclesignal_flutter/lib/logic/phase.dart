import 'cycle.dart';

class CyclePosition {
  final int cycleDay;
  final int length;
  final String phase;
  final double moonPhase; // 0..1
  CyclePosition(this.cycleDay, this.length, this.phase, this.moonPhase);
}

// Current cycle-day + phase label for the dashboard hero (PRD 0.5).
CyclePosition currentPosition(List<Cycle> cycles) {
  if (cycles.isEmpty) return CyclePosition(1, 28, 'No data yet', 0);
  final current = cycles.last;
  final cycleDay = (diffDays(todayDate(), parseIso(current.startDate)) + 1).clamp(1, 999);
  final length = current.length;
  final ratio = (cycleDay / length).clamp(0.0, 1.0);

  String phase = 'Follicular phase';
  if (cycleDay <= 5) {
    phase = 'Menstrual phase';
  } else if (ratio > 0.45 && ratio < 0.6) {
    phase = 'Ovulatory phase';
  } else if (cycleDay > length - 10) {
    phase = 'Premenstrual phase';
  } else if (ratio >= 0.6) {
    phase = 'Luteal phase';
  }
  return CyclePosition(cycleDay, length, phase, ratio);
}
