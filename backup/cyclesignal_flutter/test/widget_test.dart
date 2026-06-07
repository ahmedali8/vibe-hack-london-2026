import 'package:flutter_test/flutter_test.dart';

import 'package:cyclesignal/logic/patterns.dart';
import 'package:cyclesignal/data/synthetic_data.dart';
import 'package:cyclesignal/services/safety_service.dart';

void main() {
  test('synthetic data triggers all five pattern signals', () {
    final entries = generateSyntheticEntries(DateTime.now().toIso8601String());
    final flags = analysePatterns(entries);
    expect(flags.irregularCycles, isTrue);
    expect(flags.premenstrualMoodClustering, isTrue);
    expect(flags.repeatedFunctionalImpact, isTrue);
    expect(flags.pcosSignal, isTrue);
    expect(flags.pmddSignal, isTrue);
  });

  test('deterministic safety regex matches crisis language only', () {
    final s = SafetyService();
    expect(s.checkSafety('I want to die'), isTrue);
    expect(s.checkSafety("I couldn't get out of bed"), isFalse);
  });
}
