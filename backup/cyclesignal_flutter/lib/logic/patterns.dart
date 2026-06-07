import '../models/cycle_entry.dart';
import '../models/pattern.dart';
import 'cycle.dart';

// Deterministic Pattern Agent — PRD Section 6.3 / Section 10. Pure Dart, no AI.

bool _moodInPremenstrualWindow(Cycle c) => c.entries.any((e) =>
    e.mood?.present == true &&
    e.mood!.severity >= 3 &&
    e.cycleDay >= c.length - 10 &&
    e.cycleDay <= c.length - 1);

PatternFlags analysePatterns(List<CycleEntry> entries) {
  final all = buildCycles(entries);
  final cycles = all.length > 6 ? all.sublist(all.length - 6) : all;

  final lengths = cycles.map((c) => c.length).toList();
  final shortest = lengths.isEmpty ? 0 : lengths.reduce((a, b) => a < b ? a : b);
  final longest = lengths.isEmpty ? 0 : lengths.reduce((a, b) => a > b ? a : b);
  final average =
      lengths.isEmpty ? 0 : (lengths.reduce((a, b) => a + b) / lengths.length).round();
  final variance = longest - shortest;
  final cyclesOver35 = lengths.where((l) => l > 35).length;

  final premenstrualMoodCycles = cycles.where(_moodInPremenstrualWindow).length;
  final functionalImpactCycles =
      cycles.where((c) => c.entries.any((e) => e.functionalImpact.present)).length;
  final acneCycles = cycles.where((c) => c.entries.any((e) => e.physical.acne)).length;
  final fatigueCycles =
      cycles.where((c) => c.entries.any((e) => e.physical.fatigue?.present == true)).length;
  final acneOrHairCycles = cycles
      .where((c) => c.entries.any((e) => e.physical.acne || e.physical.hairGrowth))
      .length;

  final irregular = cyclesOver35 >= 2 || variance > 10;
  final premenstrualClustering = premenstrualMoodCycles >= 3;
  final repeatedFunctional = functionalImpactCycles >= 3;
  final pcos = irregular && acneOrHairCycles >= 2;
  final pmdd = premenstrualClustering && functionalImpactCycles >= 1;

  final offsets = <int>[];
  for (final c in cycles) {
    for (final e in c.entries) {
      if (e.mood?.present == true && e.mood!.severity >= 3 && e.cycleDay >= c.length - 10) {
        offsets.add(c.length - e.cycleDay);
      }
    }
  }
  String windowLabel = 'the days before each period';
  if (offsets.isNotEmpty) {
    final lo = offsets.reduce((a, b) => a < b ? a : b);
    final hi = offsets.reduce((a, b) => a > b ? a : b);
    windowLabel =
        lo == hi ? '$lo days before each period' : '$lo–$hi days before each period';
  }

  return PatternFlags(
    irregularCycles: irregular,
    premenstrualMoodClustering: premenstrualClustering,
    repeatedFunctionalImpact: repeatedFunctional,
    pcosSignal: pcos,
    pmddSignal: pmdd,
    cyclesTracked: cycles.length,
    averageCycleLength: average,
    cycleLengthRange: lengths.isEmpty ? '—' : '$shortest–$longest days',
    shortestCycle: shortest,
    longestCycle: longest,
    cyclesOver35Days: cyclesOver35,
    premenstrualMoodCycles: premenstrualMoodCycles,
    functionalImpactCycles: functionalImpactCycles,
    acneCycles: acneCycles,
    fatigueCycles: fatigueCycles,
    premenstrualWindowLabel: windowLabel,
  );
}

List<String> patternLabels(PatternFlags f) {
  final labels = <String>[];
  if (f.irregularCycles) labels.add('Irregular cycle pattern detected');
  if (f.premenstrualMoodClustering) labels.add('Premenstrual mood pattern detected');
  if (f.repeatedFunctionalImpact) labels.add('Repeated functional impact detected');
  if (f.pcosSignal) labels.add('PCOS-relevant symptoms present');
  if (f.pmddSignal) labels.add('PMDD-relevant pattern present');
  return labels;
}
