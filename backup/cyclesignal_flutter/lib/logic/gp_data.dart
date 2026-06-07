import '../models/cycle_entry.dart';
import '../models/pattern.dart';
import 'cycle.dart';

class SymptomRow {
  final String name;
  final int cycles;
  final String window;
  final String avgSeverity;
  SymptomRow(this.name, this.cycles, this.window, this.avgSeverity);
}

class GPData {
  final int cyclesTracked;
  final int avgLength;
  final String range;
  final int cyclesOver35;
  final int missedPeriods;
  final List<SymptomRow> symptomRows;
  final String functionalText;
  final List<String> pcosPoints;
  final List<String> pmddPoints;
  final bool redFlag;
  GPData({
    required this.cyclesTracked,
    required this.avgLength,
    required this.range,
    required this.cyclesOver35,
    required this.missedPeriods,
    required this.symptomRows,
    required this.functionalText,
    required this.pcosPoints,
    required this.pmddPoints,
    required this.redFlag,
  });
}

int _cyclesWith(List<Cycle> cs, bool Function(CycleEntry) pred) =>
    cs.where((c) => c.entries.any(pred)).length;

String _window(List<Cycle> cs, bool Function(CycleEntry) pred) {
  final days = <int>[];
  for (final c in cs) {
    for (final e in c.entries) {
      if (pred(e)) days.add(e.cycleDay);
    }
  }
  if (days.isEmpty) return '—';
  final lo = days.reduce((a, b) => a < b ? a : b);
  final hi = days.reduce((a, b) => a > b ? a : b);
  return lo == hi ? 'Day $lo' : 'Days $lo–$hi';
}

String _avg(List<Cycle> cs, int? Function(CycleEntry) get) {
  final vals = <int>[];
  for (final c in cs) {
    for (final e in c.entries) {
      final v = get(e);
      if (v != null) vals.add(v);
    }
  }
  if (vals.isEmpty) return '—';
  return (vals.reduce((a, b) => a + b) / vals.length).toStringAsFixed(1);
}

GPData computeGPData(List<CycleEntry> entries, List<Cycle> cycles, PatternFlags flags) {
  final recent = cycles.length > 6 ? cycles.sublist(cycles.length - 6) : cycles;
  final total = recent.length;

  final rows = <SymptomRow>[];
  void push(String name, bool Function(CycleEntry) pred, [int? Function(CycleEntry)? sev]) {
    final n = _cyclesWith(recent, pred);
    if (n > 0) {
      rows.add(SymptomRow(name, n, _window(recent, pred), sev != null ? _avg(recent, sev) : '—'));
    }
  }

  push('Low / unstable mood', (e) => e.mood?.present == true, (e) => e.mood?.severity);
  push('Pain', (e) => e.physical.pain?.present == true, (e) => e.physical.pain?.severity);
  push('Fatigue', (e) => e.physical.fatigue?.present == true, (e) => e.physical.fatigue?.severity);
  push('Disrupted sleep', (e) => e.physical.sleep?.disrupted == true);
  push('Acne', (e) => e.physical.acne);
  push('Excess hair growth', (e) => e.physical.hairGrowth);
  push('Bloating', (e) => e.physical.bloating);
  push('Bleeding', (e) => e.bleeding.started);

  final fiCycles = _cyclesWith(recent, (e) => e.functionalImpact.present);
  final functionalText =
      'The user reported missing work or cancelling plans in $fiCycles of $total cycles due to symptoms.';
  final missed = recent.where((c) => !c.entries.any((e) => e.bleeding.started)).length;

  final pcos = <String>[];
  if (flags.pcosSignal) {
    if (flags.irregularCycles) {
      pcos.add('Irregular cycles (range ${flags.cycleLengthRange}, ${flags.cyclesOver35Days} over 35 days)');
    }
    if (flags.acneCycles > 0) pcos.add('Acne logged in ${flags.acneCycles} cycles');
    if (_cyclesWith(recent, (e) => e.physical.hairGrowth) > 0) {
      pcos.add('Excess hair growth reported');
    }
    if (flags.fatigueCycles > 0) pcos.add('Fatigue logged in ${flags.fatigueCycles} cycles');
  }

  final pmdd = <String>[];
  if (flags.pmddSignal) {
    pmdd.add(
        'Premenstrual mood symptoms in ${flags.premenstrualMoodCycles} of $total cycles (${flags.premenstrualWindowLabel})');
    pmdd.add('Mood symptoms reported to ease after bleeding begins');
    pmdd.add('Functional impact (missed work / cancelled plans) in $fiCycles of $total cycles');
  }

  return GPData(
    cyclesTracked: total,
    avgLength: flags.averageCycleLength,
    range: flags.cycleLengthRange,
    cyclesOver35: flags.cyclesOver35Days,
    missedPeriods: missed,
    symptomRows: rows,
    functionalText: functionalText,
    pcosPoints: pcos,
    pmddPoints: pmdd,
    redFlag: entries.any((e) => e.safetyFlagged),
  );
}
