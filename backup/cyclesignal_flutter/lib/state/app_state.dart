import 'package:flutter/foundation.dart';
import '../models/cycle_entry.dart';
import '../models/pattern.dart';
import '../logic/cycle.dart';
import '../logic/patterns.dart';
import '../data/synthetic_data.dart';
import '../services/storage_service.dart';
import '../services/narrative_service.dart';

class AppState extends ChangeNotifier {
  final _storage = StorageService();
  final _narrative = NarrativeService();

  bool ready = false;
  bool consented = false;
  List<CycleEntry> entries = [];
  Map<String, bool> toggles = {for (final k in StorageService.sectionKeys) k: true};
  String statement = StorageService.defaultStatement;
  PatternAnalysis? pattern;

  List<Cycle> get cycles => buildCycles(entries);
  Heatmap get heatmap => buildHeatmap(cycles);
  String? get consentTimestamp => entries.isNotEmpty ? entries.first.consentTimestamp : null;

  Future<void> init() async {
    final consent = await _storage.getConsent();
    if (consent != null) {
      consented = true;
      var loaded = await _storage.loadEntries();
      if (loaded.isEmpty) {
        loaded = generateSyntheticEntries(consent);
        await _storage.saveEntries(loaded);
      }
      entries = loaded;
      toggles = await _storage.getToggles();
      statement = await _storage.getStatement();
      _recompute();
    }
    ready = true;
    notifyListeners();
  }

  Future<void> grantConsent() async {
    final ts = DateTime.now().toIso8601String();
    await _storage.setConsent(ts);
    final seeded = generateSyntheticEntries(ts);
    await _storage.saveEntries(seeded);
    entries = seeded;
    toggles = {for (final k in StorageService.sectionKeys) k: true};
    statement = StorageService.defaultStatement;
    consented = true;
    _recompute();
    notifyListeners();
  }

  Future<void> withdrawConsent() async {
    await _storage.withdrawConsent();
    entries = [];
    pattern = null;
    consented = false;
    notifyListeners();
  }

  Future<void> addCheckIn(CycleEntry entry) async {
    entries = [...entries, entry]..sort((a, b) => a.date.compareTo(b.date));
    await _storage.saveEntries(entries);
    _recompute();
    notifyListeners();
  }

  Future<void> removeEntry(String id) async {
    entries = entries.where((e) => e.id != id).toList();
    await _storage.saveEntries(entries);
    _recompute();
    notifyListeners();
  }

  Future<void> removeCycle(int cycleNumber) async {
    entries = entries.where((e) => e.cycleNumber != cycleNumber).toList();
    await _storage.saveEntries(entries);
    _recompute();
    notifyListeners();
  }

  Future<void> deleteAllData() async {
    await _storage.deleteAll();
    entries = [];
    toggles = {for (final k in StorageService.sectionKeys) k: true};
    statement = StorageService.defaultStatement;
    pattern = null;
    notifyListeners();
  }

  Future<void> setToggle(String key, bool value) async {
    toggles = {...toggles, key: value};
    await _storage.setToggles(toggles);
    notifyListeners();
  }

  Future<void> updateStatement(String s) async {
    statement = s;
    await _storage.setStatement(s);
    notifyListeners();
  }

  // Deterministic flags compute instantly; the warm narrative refines async (Gemini/OpenAI).
  void _recompute() {
    final flags = analysePatterns(entries);
    pattern = PatternAnalysis(
      flags: flags,
      labels: patternLabels(flags),
      narrative: '',
      narrativeModel: 'pending',
      updatedAt: DateTime.now(),
    );
    notifyListeners();
    _narrative.generate(flags).then((result) {
      pattern = result;
      notifyListeners();
    });
  }
}
