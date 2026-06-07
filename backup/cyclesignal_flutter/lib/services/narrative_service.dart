import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/pattern.dart';
import '../logic/patterns.dart';
import 'config.dart';

/// Signal Agent — PRD Section 6.3 / 5.3.
/// Primary: Gemini 3.1 Flash (raw HTTP REST). Fallback: OpenAI GPT-5.4 Mini with a
/// stricter prompt. Final fallback: deterministic on-device prose so the dashboard
/// always renders even with no keys/network. Every model output passes a hard
/// non-diagnostic keyword filter (Constraint #1) before it is shown.
class NarrativeService {
  static final _diagnostic = [
    RegExp(r'\byou have\b', caseSensitive: false),
    RegExp(r'\byou are suffering from\b', caseSensitive: false),
    RegExp(r'\bdiagnos', caseSensitive: false),
    RegExp(r'\bcaused by\b', caseSensitive: false),
  ];

  bool isNonDiagnostic(String t) => !_diagnostic.any((p) => p.hasMatch(t));

  static const _closing = 'This pattern may be worth discussing with a clinician.';

  String _onDevice(PatternFlags f) {
    if (f.cyclesTracked == 0) return 'Check in a few more times to see your pattern emerge.';
    final parts = <String>[];
    if (f.premenstrualMoodClustering) {
      parts.add(
          'Your mood symptoms have appeared in ${f.premenstrualWindowLabel} in ${f.premenstrualMoodCycles} of your last ${f.cyclesTracked} cycles.');
    }
    if (f.irregularCycles) {
      parts.add('Your cycle lengths have ranged from ${f.cycleLengthRange}.');
    }
    if (f.repeatedFunctionalImpact) {
      parts.add(
          'You have reported missing work or cancelling plans in ${f.functionalImpactCycles} of the last ${f.cyclesTracked} cycles.');
    }
    if (parts.isEmpty) {
      return 'Across ${f.cyclesTracked} tracked cycles your symptoms haven\'t yet formed a clear repeating pattern.';
    }
    return '${parts.join(' ')} $_closing';
  }

  String _prompt(PatternFlags f) => '''
You are a supportive health information assistant. Based on the following cycle pattern data, write a 2-3 sentence plain-language summary for the user.

Rules:
- Never say "you have PCOS", "you have PMDD", or any diagnostic phrase.
- Use phrases like "this pattern may be worth discussing with a clinician."
- Be warm and factual. Do not be alarmist.
- Do not recommend any treatment, medication, or lifestyle change.

Pattern data:
${jsonEncode(f.toJson())}
''';

  Future<PatternAnalysis> generate(PatternFlags flags) async {
    final labels = patternLabels(flags);
    String narrative = _onDevice(flags);
    String model = 'on-device';

    if (flags.cyclesTracked > 0) {
      final gemini = await _tryGemini(flags);
      if (gemini != null && isNonDiagnostic(gemini)) {
        narrative = gemini;
        model = 'gemini-3.1-flash';
      } else {
        final openai = await _tryOpenAiFallback(flags);
        if (openai != null && isNonDiagnostic(openai)) {
          narrative = openai;
          model = 'gpt-5.4-mini-fallback';
        }
      }
    }

    return PatternAnalysis(
      flags: flags,
      labels: labels,
      narrative: narrative,
      narrativeModel: model,
      updatedAt: DateTime.now(),
    );
  }

  Future<String?> _tryGemini(PatternFlags f) async {
    if (!AppConfig.hasGemini) return null;
    try {
      final uri = Uri.parse(
          'https://generativelanguage.googleapis.com/v1beta/models/${AppConfig.geminiModel}:generateContent?key=${AppConfig.geminiApiKey}');
      final res = await http
          .post(uri,
              headers: {'content-type': 'application/json'},
              body: jsonEncode({
                'contents': [
                  {
                    'parts': [
                      {'text': _prompt(f)}
                    ]
                  }
                ],
                'generationConfig': {'temperature': 0.4, 'maxOutputTokens': 200},
              }))
          .timeout(const Duration(seconds: 8));
      if (res.statusCode != 200) return null;
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      final cands = body['candidates'] as List?;
      if (cands == null || cands.isEmpty) return null;
      final parts = cands.first['content']?['parts'] as List?;
      final text = parts?.map((p) => p['text'] ?? '').join('').toString().trim();
      return (text == null || text.isEmpty) ? null : text;
    } catch (_) {
      return null;
    }
  }

  Future<String?> _tryOpenAiFallback(PatternFlags f) async {
    if (!AppConfig.hasOpenAi) return null;
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
                      'Write a 2-3 sentence warm, non-diagnostic cycle pattern summary. Never use the words diagnosis, "you have", or name a condition. End with: "$_closing"',
                },
                {'role': 'user', 'content': jsonEncode(f.toJson())},
              ],
              'max_tokens': 180,
            }),
          )
          .timeout(const Duration(seconds: 8));
      if (res.statusCode != 200) return null;
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      final text =
          body['choices']?[0]?['message']?['content']?.toString().trim();
      return (text == null || text.isEmpty) ? null : text;
    } catch (_) {
      return null;
    }
  }
}
