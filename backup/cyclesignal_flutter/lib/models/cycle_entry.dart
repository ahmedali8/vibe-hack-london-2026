// Data schema — PRD Section 9. CycleEntry is the only structure persisted.

class MoodEntry {
  final bool present;
  final List<String> types; // low|anxious|irritable|tearful|angry|hopeless
  final int severity; // 1..5
  final bool suddenOnset;

  MoodEntry({
    required this.present,
    required this.types,
    required this.severity,
    required this.suddenOnset,
  });

  Map<String, dynamic> toJson() =>
      {'present': present, 'types': types, 'severity': severity, 'suddenOnset': suddenOnset};

  factory MoodEntry.fromJson(Map<String, dynamic> j) => MoodEntry(
        present: j['present'] ?? false,
        types: (j['types'] as List?)?.map((e) => e.toString()).toList() ?? [],
        severity: (j['severity'] ?? 1) as int,
        suddenOnset: j['suddenOnset'] ?? false,
      );
}

class Severity {
  final bool present;
  final int severity;
  Severity({required this.present, required this.severity});
  Map<String, dynamic> toJson() => {'present': present, 'severity': severity};
  factory Severity.fromJson(Map<String, dynamic> j) =>
      Severity(present: j['present'] ?? false, severity: (j['severity'] ?? 1) as int);
}

class SleepEntry {
  final bool disrupted;
  final int nightsAffected;
  SleepEntry({required this.disrupted, required this.nightsAffected});
  Map<String, dynamic> toJson() => {'disrupted': disrupted, 'nightsAffected': nightsAffected};
  factory SleepEntry.fromJson(Map<String, dynamic> j) =>
      SleepEntry(disrupted: j['disrupted'] ?? false, nightsAffected: (j['nightsAffected'] ?? 0) as int);
}

class PhysicalEntry {
  final Severity? pain;
  final bool acne;
  final bool hairGrowth;
  final Severity? fatigue;
  final SleepEntry? sleep;
  final bool bloating;
  final List<String> other;

  PhysicalEntry({
    this.pain,
    this.acne = false,
    this.hairGrowth = false,
    this.fatigue,
    this.sleep,
    this.bloating = false,
    this.other = const [],
  });

  Map<String, dynamic> toJson() => {
        'pain': pain?.toJson(),
        'acne': acne,
        'hairGrowth': hairGrowth,
        'fatigue': fatigue?.toJson(),
        'sleep': sleep?.toJson(),
        'bloating': bloating,
        'other': other,
      };

  factory PhysicalEntry.fromJson(Map<String, dynamic> j) => PhysicalEntry(
        pain: j['pain'] == null ? null : Severity.fromJson(Map<String, dynamic>.from(j['pain'])),
        acne: j['acne'] ?? false,
        hairGrowth: j['hairGrowth'] ?? false,
        fatigue: j['fatigue'] == null
            ? null
            : Severity.fromJson(Map<String, dynamic>.from(j['fatigue'])),
        sleep: j['sleep'] == null
            ? null
            : SleepEntry.fromJson(Map<String, dynamic>.from(j['sleep'])),
        bloating: j['bloating'] ?? false,
        other: (j['other'] as List?)?.map((e) => e.toString()).toList() ?? [],
      );
}

class BleedingEntry {
  final bool started;
  final bool ended;
  final String? flow; // none|spotting|light|medium|heavy
  BleedingEntry({this.started = false, this.ended = false, this.flow});
  Map<String, dynamic> toJson() => {'started': started, 'ended': ended, 'flow': flow};
  factory BleedingEntry.fromJson(Map<String, dynamic> j) => BleedingEntry(
        started: j['started'] ?? false,
        ended: j['ended'] ?? false,
        flow: j['flow'],
      );
}

class FunctionalImpact {
  final bool present;
  final List<String> types; // missed_work|cancelled_plans|relationship_disruption|unable_to_care_for_self
  final String? severity; // mild|moderate|severe
  FunctionalImpact({this.present = false, this.types = const [], this.severity});
  Map<String, dynamic> toJson() => {'present': present, 'types': types, 'severity': severity};
  factory FunctionalImpact.fromJson(Map<String, dynamic> j) => FunctionalImpact(
        present: j['present'] ?? false,
        types: (j['types'] as List?)?.map((e) => e.toString()).toList() ?? [],
        severity: j['severity'],
      );
}

class EmotionSnapshot {
  final double distress;
  final double sadness;
  final double fear;
  final double calmness;
  EmotionSnapshot(
      {required this.distress, required this.sadness, required this.fear, required this.calmness});
  Map<String, dynamic> toJson() =>
      {'distress': distress, 'sadness': sadness, 'fear': fear, 'calmness': calmness};
  factory EmotionSnapshot.fromJson(Map<String, dynamic> j) => EmotionSnapshot(
        distress: (j['distress'] ?? 0).toDouble(),
        sadness: (j['sadness'] ?? 0).toDouble(),
        fear: (j['fear'] ?? 0).toDouble(),
        calmness: (j['calmness'] ?? 0).toDouble(),
      );
}

class CycleEntry {
  final String id;
  final String date; // ISO yyyy-MM-dd
  final int cycleDay;
  final int cycleNumber;
  final MoodEntry? mood;
  final PhysicalEntry physical;
  final BleedingEntry bleeding;
  final FunctionalImpact functionalImpact;
  final List<String> medications;
  final EmotionSnapshot? emotionSnapshot;
  final String conversationTranscript;
  final String source; // voice|text|synthetic
  final bool safetyFlagged;
  final String consentTimestamp;

  CycleEntry({
    required this.id,
    required this.date,
    required this.cycleDay,
    required this.cycleNumber,
    this.mood,
    required this.physical,
    required this.bleeding,
    required this.functionalImpact,
    this.medications = const [],
    this.emotionSnapshot,
    this.conversationTranscript = '',
    required this.source,
    this.safetyFlagged = false,
    required this.consentTimestamp,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'date': date,
        'cycleDay': cycleDay,
        'cycleNumber': cycleNumber,
        'mood': mood?.toJson(),
        'physical': physical.toJson(),
        'bleeding': bleeding.toJson(),
        'functionalImpact': functionalImpact.toJson(),
        'medications': medications,
        'emotionSnapshot': emotionSnapshot?.toJson(),
        'conversationTranscript': conversationTranscript,
        'source': source,
        'safetyFlagged': safetyFlagged,
        'consentTimestamp': consentTimestamp,
      };

  factory CycleEntry.fromJson(Map<String, dynamic> j) => CycleEntry(
        id: j['id'],
        date: j['date'],
        cycleDay: j['cycleDay'],
        cycleNumber: j['cycleNumber'],
        mood: j['mood'] == null ? null : MoodEntry.fromJson(Map<String, dynamic>.from(j['mood'])),
        physical: PhysicalEntry.fromJson(Map<String, dynamic>.from(j['physical'])),
        bleeding: BleedingEntry.fromJson(Map<String, dynamic>.from(j['bleeding'])),
        functionalImpact:
            FunctionalImpact.fromJson(Map<String, dynamic>.from(j['functionalImpact'])),
        medications: (j['medications'] as List?)?.map((e) => e.toString()).toList() ?? [],
        emotionSnapshot: j['emotionSnapshot'] == null
            ? null
            : EmotionSnapshot.fromJson(Map<String, dynamic>.from(j['emotionSnapshot'])),
        conversationTranscript: j['conversationTranscript'] ?? '',
        source: j['source'] ?? 'synthetic',
        safetyFlagged: j['safetyFlagged'] ?? false,
        consentTimestamp: j['consentTimestamp'] ?? '',
      );
}
