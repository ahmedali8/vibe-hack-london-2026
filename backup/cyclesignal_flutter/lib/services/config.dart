/// Compile-time configuration for live third-party integrations.
///
/// Keys are injected via --dart-define so they are never hard-coded in source:
///
///   flutter run \
///     --dart-define=HUME_API_KEY=... \
///     --dart-define=HUME_CONFIG_ID=... \
///     --dart-define=HUME_TOKEN_ENDPOINT=https://your-backend/hume-token \
///     --dart-define=OPENAI_API_KEY=... \
///     --dart-define=GEMINI_API_KEY=... \
///     --dart-define=ANTHROPIC_API_KEY=...
///
/// PRD Constraints #7/#8: provider keys must not ship in a client. For production,
/// set *_TOKEN_ENDPOINT / *_PROXY values to route through your own backend; the
/// direct-key fields are a development convenience only. When a key is absent, the
/// corresponding layer falls back to the deterministic on-device path so the app
/// still runs end-to-end with synthetic data.
class AppConfig {
  // Hume EVI 3 (voice)
  static const humeApiKey = String.fromEnvironment('HUME_API_KEY');
  static const humeConfigId = String.fromEnvironment('HUME_CONFIG_ID');
  // Recommended: a backend endpoint returning a short-lived access token { "access_token": "..." }
  static const humeTokenEndpoint = String.fromEnvironment('HUME_TOKEN_ENDPOINT');

  // OpenAI (symptom extraction — GPT-5.4 Mini per PRD 5.2)
  static const openAiApiKey = String.fromEnvironment('OPENAI_API_KEY');
  static const openAiModel =
      String.fromEnvironment('OPENAI_MODEL', defaultValue: 'gpt-5.4-mini');

  // Google Gemini (pattern narrative — Gemini 3.1 Flash per PRD 5.3)
  static const geminiApiKey = String.fromEnvironment('GEMINI_API_KEY');
  static const geminiModel =
      String.fromEnvironment('GEMINI_MODEL', defaultValue: 'gemini-3.1-flash');

  // Anthropic (secondary safety classifier — Claude Haiku 4.5 per PRD 5.5)
  static const anthropicApiKey = String.fromEnvironment('ANTHROPIC_API_KEY');
  static const anthropicModel =
      String.fromEnvironment('ANTHROPIC_MODEL', defaultValue: 'claude-haiku-4-5');

  static bool get hasHume => humeApiKey.isNotEmpty || humeTokenEndpoint.isNotEmpty;
  static bool get hasOpenAi => openAiApiKey.isNotEmpty;
  static bool get hasGemini => geminiApiKey.isNotEmpty;
  static bool get hasAnthropic => anthropicApiKey.isNotEmpty;
}
