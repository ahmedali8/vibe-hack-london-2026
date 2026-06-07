import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/cycle_entry.dart';

/// Local Storage — PRD Section 5.6. The web stack uses Dexie/IndexedDB; the mobile
/// equivalent privacy-first local store is shared_preferences: no server, no account,
/// no transmission (Constraint #4). All data stays on the device.
class StorageService {
  static const _kEntries = 'cyclesignal:entries';
  static const _kConsent = 'cyclesignal:consent';
  static const _kToggles = 'cyclesignal:gpToggles';
  static const _kStatement = 'cyclesignal:statement';

  static const defaultStatement =
      'I want to understand whether PCOS or PMDD should be assessed.';

  static const List<String> sectionKeys = [
    'patientStatement',
    'cycleOverview',
    'symptomTimeline',
    'symptomSummary',
    'functionalImpact',
    'pcosPoints',
    'pmddPoints',
    'redFlags',
  ];

  Future<SharedPreferences> get _prefs => SharedPreferences.getInstance();

  Future<List<CycleEntry>> loadEntries() async {
    final raw = (await _prefs).getString(_kEntries);
    if (raw == null) return [];
    try {
      final list = jsonDecode(raw) as List;
      return list.map((e) => CycleEntry.fromJson(Map<String, dynamic>.from(e))).toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> saveEntries(List<CycleEntry> entries) async {
    final raw = jsonEncode(entries.map((e) => e.toJson()).toList());
    await (await _prefs).setString(_kEntries, raw);
  }

  Future<String?> getConsent() async => (await _prefs).getString(_kConsent);
  Future<void> setConsent(String ts) async => (await _prefs).setString(_kConsent, ts);

  Future<void> deleteAll() async {
    final p = await _prefs;
    await p.remove(_kEntries);
    await p.remove(_kToggles);
    await p.remove(_kStatement);
  }

  Future<void> withdrawConsent() async {
    final p = await _prefs;
    await p.remove(_kEntries);
    await p.remove(_kToggles);
    await p.remove(_kStatement);
    await p.remove(_kConsent);
  }

  Future<Map<String, bool>> getToggles() async {
    final raw = (await _prefs).getString(_kToggles);
    final defaults = {for (final k in sectionKeys) k: true};
    if (raw == null) return defaults;
    try {
      final m = Map<String, dynamic>.from(jsonDecode(raw));
      return {for (final k in sectionKeys) k: (m[k] ?? true) as bool};
    } catch (_) {
      return defaults;
    }
  }

  Future<void> setToggles(Map<String, bool> t) async =>
      (await _prefs).setString(_kToggles, jsonEncode(t));

  Future<String> getStatement() async =>
      (await _prefs).getString(_kStatement) ?? defaultStatement;
  Future<void> setStatement(String s) async => (await _prefs).setString(_kStatement, s);
}
