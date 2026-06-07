import 'package:intl/intl.dart';
import '../models/cycle_entry.dart';
import '../theme/app_theme.dart';
import 'package:flutter/material.dart';

// --- Date helpers (date-only) ---
DateTime parseIso(String d) => DateTime.parse('${d}T00:00:00');
String toIsoDate(DateTime d) => DateFormat('yyyy-MM-dd').format(d);
DateTime addDays(DateTime d, int n) => DateTime(d.year, d.month, d.day + n);
int diffDays(DateTime a, DateTime b) => a.difference(b).inDays;
String monthLabel(DateTime d) => DateFormat('MMM yyyy').format(d);
String prettyDate(String iso) => DateFormat('EEE d MMM yyyy').format(parseIso(iso));
DateTime todayDate() {
  final n = DateTime.now();
  return DateTime(n.year, n.month, n.day);
}

class Cycle {
  final int cycleNumber;
  final String startDate;
  final String label;
  final int length;
  final bool isIrregular;
  final List<CycleEntry> entries;
  Cycle({
    required this.cycleNumber,
    required this.startDate,
    required this.label,
    required this.length,
    required this.isIrregular,
    required this.entries,
  });
}

List<Cycle> buildCycles(List<CycleEntry> entries) {
  final byNumber = <int, List<CycleEntry>>{};
  for (final e in entries) {
    byNumber.putIfAbsent(e.cycleNumber, () => []).add(e);
  }
  final numbers = byNumber.keys.toList()..sort();
  final starts = <int, DateTime>{};
  for (final n in numbers) {
    final dates = byNumber[n]!.map((e) => parseIso(e.date)).toList();
    dates.sort();
    starts[n] = dates.first;
  }
  final today = todayDate();

  final out = <Cycle>[];
  for (var i = 0; i < numbers.length; i++) {
    final n = numbers[i];
    final start = starts[n]!;
    final cycleEntries = byNumber[n]!..sort((a, b) => a.cycleDay.compareTo(b.cycleDay));
    int length;
    if (i < numbers.length - 1) {
      length = diffDays(starts[numbers[i + 1]]!, start);
    } else {
      final maxDay = cycleEntries.map((e) => e.cycleDay).fold<int>(1, (p, c) => c > p ? c : p);
      final elapsed = diffDays(today, start) + 1;
      length = maxDay > elapsed ? maxDay : elapsed;
    }
    out.add(Cycle(
      cycleNumber: n,
      startDate: toIsoDate(start),
      label: 'Cycle $n — ${monthLabel(start)}',
      length: length,
      isIrregular: length > 35,
      entries: cycleEntries,
    ));
  }
  return out;
}

enum CellCategory { none, bleeding, moodLow, moodMid, moodHigh, physical }

class Cell {
  final int cycleNumber;
  final int cycleDay;
  final CellCategory category;
  final Color color;
  final bool hasFunctionalImpact;
  final bool safetyFlagged;
  final CycleEntry? entry;
  final bool premenstrual;
  Cell({
    required this.cycleNumber,
    required this.cycleDay,
    required this.category,
    required this.color,
    required this.hasFunctionalImpact,
    required this.safetyFlagged,
    required this.entry,
    required this.premenstrual,
  });
}

({CellCategory category, Color color}) _categorise(CycleEntry? e) {
  if (e == null) return (category: CellCategory.none, color: AppColors.cellNoData);
  final b = e.bleeding;
  if (b.started || (b.flow != null && b.flow != 'none')) {
    return (category: CellCategory.bleeding, color: AppColors.cellBleeding);
  }
  if (e.mood?.present == true) {
    final s = e.mood!.severity;
    if (s >= 4) return (category: CellCategory.moodHigh, color: AppColors.cellMoodHigh);
    if (s == 3) return (category: CellCategory.moodMid, color: AppColors.cellMoodMid);
    return (category: CellCategory.moodLow, color: AppColors.cellMoodLow);
  }
  final p = e.physical;
  final physical = (p.pain?.present ?? false) ||
      (p.fatigue?.present ?? false) ||
      p.acne ||
      p.hairGrowth ||
      p.bloating;
  if (physical) return (category: CellCategory.physical, color: AppColors.cellPhysical);
  return (category: CellCategory.none, color: AppColors.cellNoData);
}

class Heatmap {
  final int maxDay;
  final List<List<Cell>> rows;
  Heatmap({required this.maxDay, required this.rows});
}

Heatmap buildHeatmap(List<Cycle> cycles) {
  if (cycles.isEmpty) return Heatmap(maxDay: 1, rows: const []);
  var maxLen = cycles.map((c) => c.length).fold<int>(1, (p, c) => c > p ? c : p);
  final maxDay = maxLen > 65 ? 65 : maxLen;
  final rows = cycles.map((cycle) {
    final byDay = {for (final e in cycle.entries) e.cycleDay: e};
    final cells = <Cell>[];
    for (var day = 1; day <= maxDay; day++) {
      final entry = byDay[day];
      final c = _categorise(entry);
      final premenstrual = day > cycle.length - 10 && day <= cycle.length;
      cells.add(Cell(
        cycleNumber: cycle.cycleNumber,
        cycleDay: day,
        category: c.category,
        color: c.color,
        hasFunctionalImpact: entry?.functionalImpact.present ?? false,
        safetyFlagged: entry?.safetyFlagged ?? false,
        entry: entry,
        premenstrual: premenstrual,
      ));
    }
    return cells;
  }).toList();
  return Heatmap(maxDay: maxDay, rows: rows);
}

List<String> describeEntry(CycleEntry e) {
  final out = <String>[];
  if (e.mood?.present == true) {
    final types = e.mood!.types.isEmpty ? 'low' : e.mood!.types.join(', ');
    out.add('Mood: $types (severity ${e.mood!.severity})');
  }
  if (e.physical.pain?.present == true) {
    out.add('Pain (severity ${e.physical.pain!.severity})');
  }
  if (e.physical.fatigue?.present == true) {
    out.add('Fatigue (severity ${e.physical.fatigue!.severity})');
  }
  if (e.physical.sleep?.disrupted == true) {
    out.add('Disrupted sleep (${e.physical.sleep!.nightsAffected} nights)');
  }
  if (e.physical.acne) out.add('Acne');
  if (e.physical.hairGrowth) out.add('Hair growth');
  if (e.physical.bloating) out.add('Bloating');
  if (e.bleeding.started || (e.bleeding.flow != null && e.bleeding.flow != 'none')) {
    out.add('Bleeding${e.bleeding.flow != null ? ' (${e.bleeding.flow})' : ''}');
  }
  if (e.functionalImpact.present) {
    out.add('Functional impact: ${e.functionalImpact.types.join(', ')}');
  }
  if (e.medications.isNotEmpty) out.add('Medications: ${e.medications.join(', ')}');
  return out.isEmpty ? ['No symptoms logged'] : out;
}
