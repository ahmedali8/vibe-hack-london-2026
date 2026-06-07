import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:uuid/uuid.dart';
import '../models/cycle_entry.dart';
import 'config.dart';

/// Extraction Agent — PRD Section 5.2 / 6.1.
/// Primary: OpenAI GPT-5.4 Mini with strict JSON-schema structured outputs (raw HTTP).
/// Also used as the fallback when EVI 3's `store_symptom_entry` tool call is absent.
/// Final fallback: deterministic on-device keyword extraction so a check-in always
/// produces a typed CycleEntry, even offline.
class ExtractionService {
  static const _uuid = Uuid();

  Future<CycleEntry> extract({
    required String transcript,
    required int cycleDay,
    required int cycleNumber,
    required String consentTimestamp,
    EmotionSnapshot? emotionSnapshot,
    required String source,
  }) async {
    Map<String, dynamic>? fields;
    if (AppConfig.hasOpenAi && transcript.trim().isNotEmpty) {
      fields = await _openAiExtract(transcript);
    }
    fields ??= _onDeviceExtract(transcript);
    return _build(fields, transcript, cycleDay, cycleNumber, consentTimestamp,
        emotionSnapshot, source);
  }

  /// Build a CycleEntry directly from EVI 3's store_symptom_entry tool arguments.
  CycleEntry buildFromToolArgs(
    Map<String, dynamic> args, {
    required String transcript,
    required int cycleDay,
    required int cycleNumber,
    required String consentTimestamp,
    EmotionSnapshot? emotionSnapshot,
  }) =>
      _build(args, transcript, cycleDay, cycleNumber, consentTimestamp, emotionSnapshot,
          'voice');

  CycleEntry _build(
    Map<String, dynamic> f,
    String transcript,
    int cycleDay,
    int cycleNumber,
    String consent,
    EmotionSnapshot? emotion,
    String source,
  ) {
    int clampSev(dynamic v) {
      final n = (v is num) ? v.round() : 3;
      return n.clamp(1, 5);
    }

    final moodMap = f['mood'] as Map?;
    MoodEntry? mood;
    if (moodMap != null && moodMap['present'] == true) {
      mood = MoodEntry(
        present: true,
        types: ((moodMap['types'] as List?) ?? const []).map((e) => e.toString()).toList(),
        severity: clampSev(moodMap['severity']),
        suddenOnset: moodMap['suddenOnset'] == true,
      );
    }

    Severity? sev(Map? m) =>
        (m != null && m['present'] == true) ? Severity(present: true, severity: clampSev(m['severity'])) : null;

    final sleepMap = f['sleep'] as Map?;
    final bleedMap = (f['bleeding'] as Map?) ?? const {};
    final fiMap = (f['functionalImpact'] as Map?) ?? const {};

    return CycleEntry(
      id: _uuid.v4(),
      date: DateTime.now().toIso8601String().substring(0, 10),
      cycleDay: cycleDay,
      cycleNumber: cycleNumber,
      mood: mood,
      physical: PhysicalEntry(
        pain: sev(f['pain'] as Map?),
        acne: f['acne'] == true,
        hairGrowth: f['hairGrowth'] == true,
        fatigue: sev(f['fatigue'] as Map?),
        sleep: (sleepMap != null && sleepMap['disrupted'] == true)
            ? SleepEntry(
                disrupted: true,
                nightsAffected: (sleepMap['nightsAffected'] is num)
                    ? (sleepMap['nightsAffected'] as num).round()
                    : 1)
            : null,
        bloating: f['bloating'] == true,
      ),
      bleeding: BleedingEntry(
        started: bleedMap['started'] == true,
        ended: bleedMap['ended'] == true,
        flow: bleedMap['flow'] as String?,
      ),
      functionalImpact: FunctionalImpact(
        present: fiMap['present'] == true,
        types: ((fiMap['types'] as List?) ?? const []).map((e) => e.toString()).toList(),
        severity: fiMap['severity'] as String?,
      ),
      medications: ((f['medications'] as List?) ?? const []).map((e) => e.toString()).toList(),
      emotionSnapshot: emotion,
      conversationTranscript:
          transcript.length > 2000 ? transcript.substring(0, 2000) : transcript,
      source: source,
      safetyFlagged: false,
      consentTimestamp: consent,
    );
  }

  static const _schema = {
    'type': 'object',
    'additionalProperties': false,
    'properties': {
      'mood': {
        'type': 'object',
        'additionalProperties': false,
        'properties': {
          'present': {'type': 'boolean'},
          'types': {
            'type': 'array',
            'items': {
              'type': 'string',
              'enum': ['low', 'anxious', 'irritable', 'tearful', 'angry', 'hopeless']
            }
          },
          'severity': {'type': 'integer', 'enum': [1, 2, 3, 4, 5]},
          'suddenOnset': {'type': 'boolean'}
        },
        'required': ['present', 'types', 'severity', 'suddenOnset']
      },
      'pain': {
        'type': 'object',
        'additionalProperties': false,
        'properties': {
          'present': {'type': 'boolean'},
          'severity': {'type': 'integer', 'enum': [1, 2, 3, 4, 5]}
        },
        'required': ['present', 'severity']
      },
      'fatigue': {
        'type': 'object',
        'additionalProperties': false,
        'properties': {
          'present': {'type': 'boolean'},
          'severity': {'type': 'integer', 'enum': [1, 2, 3, 4, 5]}
        },
        'required': ['present', 'severity']
      },
      'sleep': {
        'type': 'object',
        'additionalProperties': false,
        'properties': {
          'disrupted': {'type': 'boolean'},
          'nightsAffected': {'type': 'integer'}
        },
        'required': ['disrupted', 'nightsAffected']
      },
      'acne': {'type': 'boolean'},
      'hairGrowth': {'type': 'boolean'},
      'bloating': {'type': 'boolean'},
      'bleeding': {
        'type': 'object',
        'additionalProperties': false,
        'properties': {
          'started': {'type': 'boolean'},
          'ended': {'type': 'boolean'},
          'flow': {
            'type': 'string',
            'enum': ['none', 'spotting', 'light', 'medium', 'heavy']
          }
        },
        'required': ['started', 'ended', 'flow']
      },
      'functionalImpact': {
        'type': 'object',
        'additionalProperties': false,
        'properties': {
          'present': {'type': 'boolean'},
          'types': {
            'type': 'array',
            'items': {
              'type': 'string',
              'enum': [
                'missed_work',
                'cancelled_plans',
                'relationship_disruption',
                'unable_to_care_for_self'
              ]
            }
          },
          'severity': {
            'type': 'string',
            'enum': ['mild', 'moderate', 'severe']
          }
        },
        'required': ['present', 'types', 'severity']
      },
      'medications': {
        'type': 'array',
        'items': {'type': 'string'}
      }
    },
    'required': [
      'mood',
      'pain',
      'fatigue',
      'sleep',
      'acne',
      'hairGrowth',
      'bloating',
      'bleeding',
      'functionalImpact',
      'medications'
    ]
  };

  Future<Map<String, dynamic>?> _openAiExtract(String transcript) async {
    try {
      final res = await http
          .post(
            Uri.parse('https://api.openai.com/v1/chat/completions'),
            headers: {
              'content-type': 'application/json',
              'authorization': 'Bearer ${AppConfig.openAiApiKey}',
            },
            body: jsonEncode({
              'model': AppConfig.openAiModel,
              'messages': [
                {
                  'role': 'system',
                  'content':
                      'Extract cycle-linked symptoms from the conversation transcript into the schema. '
                          'Use false/empty/none when a field is not mentioned. Do not invent values.',
                },
                {'role': 'user', 'content': transcript},
              ],
              'response_format': {
                'type': 'json_schema',
                'json_schema': {'name': 'cycle_entry', 'strict': true, 'schema': _schema},
              },
            }),
          )
          .timeout(const Duration(seconds: 12));
      if (res.statusCode != 200) return null;
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      final content = body['choices']?[0]?['message']?['content'];
      if (content == null) return null;
      return Map<String, dynamic>.from(jsonDecode(content));
    } catch (_) {
      return null;
    }
  }

  // Deterministic offline extractor (keyword based) — mirrors the web build.
  Map<String, dynamic> _onDeviceExtract(String transcript) {
    final t = transcript.toLowerCase();
    bool has(String re) => RegExp(re).hasMatch(t);

    final moodTypes = <String>[];
    if (has(r"\b(low|down|crash|couldn'?t get out of bed|empty|flat)\b")) moodTypes.add('low');
    if (has(r'\b(anxious|anxiety|on edge|panicky)\b')) moodTypes.add('anxious');
    if (has(r'\b(irritable|snappy|frustrated)\b')) moodTypes.add('irritable');
    if (has(r'\b(tearful|crying|cried)\b')) moodTypes.add('tearful');
    if (has(r'\b(angry|rage)\b')) moodTypes.add('angry');
    if (has(r'\b(hopeless|pointless)\b')) moodTypes.add('hopeless');
    var moodSev = 3;
    if (has(r'\b(really|so|very|extremely|completely)\b')) moodSev = 4;
    if (has(r"\b(couldn'?t get out of bed|crash|worst)\b")) moodSev = 5;

    int nights() {
      final m = RegExp(r'(\d+)\s*(?:day|night)').firstMatch(t);
      if (m != null) return int.parse(m.group(1)!);
      const words = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5};
      for (final e in words.entries) {
        if (RegExp('\\b${e.key}\\b\\s*(?:day|night)').hasMatch(t)) return e.value;
      }
      return 0;
    }

    final fiTypes = <String>[];
    if (has(r"\b(missed work|off work|called in sick|cancelled a meeting|couldn'?t work)\b")) {
      fiTypes.add('missed_work');
    }
    if (has(r"\b(cancelled|cancel plans|stayed in|couldn'?t go)\b")) fiTypes.add('cancelled_plans');

    return {
      'mood': {
        'present': moodTypes.isNotEmpty,
        'types': moodTypes,
        'severity': moodSev,
        'suddenOnset': has(r'\b(sudden|crash|out of nowhere|hits)\b'),
      },
      'pain': {'present': has(r'\b(pain|cramp|ache|sore)\b'), 'severity': 3},
      'fatigue': {'present': has(r'\b(tired|exhausted|fatigue|drained|no energy)\b'), 'severity': 4},
      'sleep': {
        'disrupted': has(r"\b(sleep|insomnia|haven'?t slept|can'?t sleep|awake)\b"),
        'nightsAffected': nights() == 0 ? 1 : nights(),
      },
      'acne': has(r'\b(acne|breakout|spots)\b'),
      'hairGrowth': has(r'\b(hair growth|hirsut|facial hair)\b'),
      'bloating': has(r'\b(bloat|bloated|swollen)\b'),
      'bleeding': {
        'started': has(r'\b(period started|bleeding|on my period|came on)\b'),
        'ended': has(r'\b(period (?:ended|finished|stopped))\b'),
        'flow': has(r'\bheavy\b') ? 'heavy' : (has(r'\blight\b') ? 'light' : 'none'),
      },
      'functionalImpact': {
        'present': fiTypes.isNotEmpty,
        'types': fiTypes,
        'severity': fiTypes.length > 1 ? 'moderate' : (fiTypes.length == 1 ? 'mild' : 'mild'),
      },
      'medications': <String>[],
    };
  }
}
