import 'dart:convert';
import 'package:http/http.dart' as http;
import 'config.dart';

/// Safety layer — PRD Feature 5 / Section 5.5.
///
/// Primary: hard-coded, deterministic RegExp. Runs synchronously on every text input
/// and every transcript turn BEFORE any AI processing. Never delegated to a model,
/// never overridable (Constraint #2). This is the absolute safety floor.
///
/// Secondary: Anthropic Safety Classifier (Claude Haiku 4.5, PRD 5.5) over raw HTTP —
/// no official Anthropic Dart SDK exists, so the sanctioned path is raw HTTP. Runs
/// asynchronously and only *adds* detections; it can never suppress the regex result,
/// and any failure degrades silently to regex-only.
class SafetyService {
  static final List<RegExp> _keywords = [
    RegExp(r"\b(suicid|kill myself|end my life|don't want to be here|want to die)\b",
        caseSensitive: false),
    RegExp(r"\b(self.?harm|cutting|hurt myself|hurting myself)\b", caseSensitive: false),
    RegExp(r"\b(overdose|take all my pills)\b", caseSensitive: false),
    RegExp(r"\b(can't go on|no point in living|nobody would miss me)\b", caseSensitive: false),
  ];

  /// Primary, deterministic check (<1ms, offline).
  bool checkSafety(String text) => _keywords.any((re) => re.hasMatch(text));

  /// Secondary trigger on EVI 3 prosody scores — PRD Section 6 emotion detection.
  bool checkEmotionSafety(Map<String, double> scores) {
    final distress = (scores['Distress'] ?? 0) + (scores['Fear'] ?? 0) + (scores['Sadness'] ?? 0);
    return distress > 0.75;
  }

  /// Async secondary classifier — Claude Haiku 4.5 via the Messages API (raw HTTP).
  /// Returns true only on a confident crisis flag. Returns false on any error,
  /// missing key, or timeout so it never blocks the user or overrides the regex.
  Future<bool> classifyCrisis(String text) async {
    if (!AppConfig.hasAnthropic || text.trim().isEmpty) return false;
    try {
      final res = await http
          .post(
            Uri.parse('https://api.anthropic.com/v1/messages'),
            headers: {
              'content-type': 'application/json',
              'x-api-key': AppConfig.anthropicApiKey,
              'anthropic-version': '2023-06-01',
            },
            body: jsonEncode({
              'model': AppConfig.anthropicModel, // claude-haiku-4-5
              'max_tokens': 128,
              'system':
                  'You are a mental-health safety classifier. Decide if the user message '
                      'expresses suicidal ideation, self-harm intent, or an acute mental-health '
                      'crisis. Respond ONLY with a JSON object: '
                      '{"crisis": boolean, "confidence": number between 0 and 1}.',
              'messages': [
                {
                  'role': 'user',
                  'content': text.length > 2000 ? text.substring(0, 2000) : text,
                }
              ],
            }),
          )
          .timeout(const Duration(seconds: 2));

      if (res.statusCode != 200) return false;
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      final content = (body['content'] as List?) ?? const [];
      final textBlock = content.firstWhere(
        (b) => b is Map && b['type'] == 'text',
        orElse: () => null,
      );
      if (textBlock == null) return false;
      final parsed = _extractJson(textBlock['text'] as String);
      if (parsed == null) return false;
      final crisis = parsed['crisis'] == true;
      final confidence = (parsed['confidence'] ?? 0).toDouble();
      return crisis && confidence >= 0.5;
    } catch (_) {
      return false; // degrade to regex-only
    }
  }

  Map<String, dynamic>? _extractJson(String s) {
    final start = s.indexOf('{');
    final end = s.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try {
      return Map<String, dynamic>.from(jsonDecode(s.substring(start, end + 1)));
    } catch (_) {
      return null;
    }
  }
}

class SafetyResource {
  final String name;
  final String detail;
  final String tel;
  const SafetyResource(this.name, this.detail, this.tel);
}

// Hard-coded crisis resources — PRD Feature 5 / Constraint #10. Numbers must match exactly.
const safetyResources = [
  SafetyResource('Samaritans', '116 123 (free, 24/7) · jo@samaritans.org', '116123'),
  SafetyResource('Shout Crisis Text Line', 'Text SHOUT to 85258 (free, 24/7)', '85258'),
  SafetyResource('NHS 111', 'Call 111 and select the mental health option', '111'),
  SafetyResource('999 or A&E', 'If you are in immediate danger', '999'),
];

const safetyHeadline =
    'It sounds like you might be going through something very difficult right now.';
const safetyBody =
    "You don't have to face this alone. Please reach out to one of these services:";
const safetyFooter =
    'CycleSignal AI is not able to provide crisis support. Please contact one of the services above.';
