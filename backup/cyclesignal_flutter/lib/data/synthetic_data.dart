import 'package:uuid/uuid.dart';
import '../models/cycle_entry.dart';
import '../logic/cycle.dart';

// Demo user "Amara" — PRD Section 8. Fake data only (the AI layers are real).
// 6 cycles, lengths 42/38/55/61/44/39 (irregular). Premenstrual mood crashes (sev 4-5),
// functional impact in 4 of 6, acne in 3 of 6, fatigue in 5 of 6. No safety-trigger text.

const _uuid = Uuid();
const _lengths = {1: 42, 2: 38, 3: 55, 4: 61, 5: 44, 6: 39};
const _functionalImpactCycles = {1, 2, 3, 4};
const _acneCycles = {2, 4, 6};
const _fatigueCycles = {1, 2, 3, 4, 5};

CycleEntry _empty(String date, int day, int n, String consent) => CycleEntry(
      id: _uuid.v4(),
      date: date,
      cycleDay: day,
      cycleNumber: n,
      physical: PhysicalEntry(),
      bleeding: BleedingEntry(),
      functionalImpact: FunctionalImpact(),
      source: 'synthetic',
      consentTimestamp: consent,
    );

List<CycleEntry> generateSyntheticEntries(String consent) {
  final today = todayDate();
  final todayIso = toIsoDate(today);

  final starts = <int, DateTime>{};
  starts[6] = addDays(today, -23); // current cycle on day 24 (PRD: "you're on day 24")
  for (var n = 5; n >= 1; n--) {
    starts[n] = addDays(starts[n + 1]!, -_lengths[n]!);
  }

  final entries = <CycleEntry>[];

  for (var n = 1; n <= 6; n++) {
    final L = _lengths[n]!;
    final start = starts[n]!;
    String at(int day) => toIsoDate(addDays(start, day - 1));

    // Menstruation days 1-4
    final bleed = [
      [1, 'medium', 1, 0],
      [2, 'medium', 0, 0],
      [3, 'light', 0, 0],
      [4, 'light', 0, 1],
    ];
    for (final b in bleed) {
      final e = _empty(at(b[0] as int), b[0] as int, n, consent);
      entries.add(CycleEntry(
        id: e.id,
        date: e.date,
        cycleDay: e.cycleDay,
        cycleNumber: e.cycleNumber,
        physical: PhysicalEntry(),
        bleeding: BleedingEntry(
            started: b[2] == 1, ended: b[3] == 1, flow: b[1] as String),
        functionalImpact: FunctionalImpact(),
        source: 'synthetic',
        consentTimestamp: consent,
      ));
    }

    // Acne mid-cycle (day 10) for selected cycles
    if (_acneCycles.contains(n)) {
      final e = _empty(at(10), 10, n, consent);
      entries.add(CycleEntry(
        id: e.id,
        date: e.date,
        cycleDay: 10,
        cycleNumber: n,
        physical: PhysicalEntry(acne: true),
        bleeding: BleedingEntry(),
        functionalImpact: FunctionalImpact(),
        source: 'synthetic',
        consentTimestamp: consent,
      ));
    }

    // Premenstrual mood crashes — days L-6, L-4, L-2
    final premen = [
      {'day': L - 6, 'sev': 4, 'types': ['low'], 'sudden': false, 'idx': 0},
      {'day': L - 4, 'sev': 5, 'types': ['low', 'tearful'], 'sudden': true, 'idx': 1},
      {'day': L - 2, 'sev': 4, 'types': ['low', 'irritable'], 'sudden': false, 'idx': 2},
    ];
    for (final p in premen) {
      final day = p['day'] as int;
      final idx = p['idx'] as int;
      Severity? fatigue;
      SleepEntry? sleep;
      if (_fatigueCycles.contains(n) && idx == 1) {
        fatigue = Severity(present: true, severity: 4);
        sleep = SleepEntry(disrupted: true, nightsAffected: 3);
      }
      FunctionalImpact fi = FunctionalImpact();
      if (_functionalImpactCycles.contains(n) && idx == 2) {
        fi = FunctionalImpact(
          present: true,
          types: [n.isEven ? 'cancelled_plans' : 'missed_work'],
          severity: 'moderate',
        );
      }
      entries.add(CycleEntry(
        id: _uuid.v4(),
        date: at(day),
        cycleDay: day,
        cycleNumber: n,
        mood: MoodEntry(
          present: true,
          types: (p['types'] as List).cast<String>(),
          severity: p['sev'] as int,
          suddenOnset: p['sudden'] as bool,
        ),
        physical: PhysicalEntry(fatigue: fatigue, sleep: sleep),
        bleeding: BleedingEntry(),
        functionalImpact: fi,
        source: 'synthetic',
        consentTimestamp: consent,
      ));
    }
  }

  // Never seed entries in the future (current cycle is only partway through).
  final filtered = entries.where((e) => e.date.compareTo(todayIso) <= 0).toList()
    ..sort((a, b) => a.date.compareTo(b.date));
  return filtered;
}
