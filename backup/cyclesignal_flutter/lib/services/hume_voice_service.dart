import 'dart:async';
import 'dart:convert';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:permission_handler/permission_handler.dart';
import 'package:record/record.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import '../models/cycle_entry.dart';
import 'config.dart';
import 'extraction_service.dart';
import 'safety_service.dart';

enum VoicePhase { connecting, talking, saved, error }

enum RingMode { idle, user, ai }

class ConvTurn {
  final String role; // 'ai' | 'user'
  final String text;
  final String? emotion;
  const ConvTurn(this.role, this.text, [this.emotion]);
}

/// Voice Conversation Layer — PRD Feature 1 / Section 5.1: live Hume AI EVI 3.
///
/// Real integration: streams mic PCM16 to the EVI chat WebSocket, plays back EVI's
/// audio, surfaces transcripts + prosody emotion, and handles the `store_symptom_entry`
/// tool call. The deterministic safety regex runs on every user transcript turn before
/// anything else (Constraint #2). No raw audio is ever persisted (Constraint #3).
///
/// Requires a real device/mic and either HUME_TOKEN_ENDPOINT (recommended, Constraint #7)
/// or HUME_API_KEY. With no Hume config the screen runs the scripted demo path instead.
class HumeVoiceService extends ChangeNotifier {
  HumeVoiceService({
    required this.cycleDay,
    required this.cycleNumber,
    required this.consentTimestamp,
    required this.onStored,
    required this.onSafety,
  });

  final int cycleDay;
  final int cycleNumber;
  final String consentTimestamp;
  final void Function(CycleEntry entry) onStored;
  final VoidCallback onSafety;

  final _safety = SafetyService();
  final _extractor = ExtractionService();
  final _recorder = AudioRecorder();
  final _player = AudioPlayer();

  WebSocketChannel? _channel;
  StreamSubscription? _wsSub;
  StreamSubscription<Uint8List>? _micSub;
  StreamSubscription? _playerSub;

  // Public state
  VoicePhase phase = VoicePhase.connecting;
  RingMode mode = RingMode.ai;
  final List<ConvTurn> turns = [];
  String? emotion;
  int userTurns = 0;
  String? errorMessage;

  EmotionSnapshot _lastSnapshot =
      EmotionSnapshot(distress: 0, sadness: 0, fear: 0, calmness: 0.5);
  bool _stored = false;
  bool _disposed = false;

  final List<Uint8List> _audioQueue = [];
  bool _playing = false;

  Future<void> start() async {
    try {
      final granted = await Permission.microphone.request();
      if (!granted.isGranted) {
        _fail('Microphone permission is required for the voice check-in.');
        return;
      }
      final auth = await _authQuery();
      if (auth == null) {
        _fail('Hume EVI is not configured.');
        return;
      }
      final params = StringBuffer(auth)..write('&evi_version=3');
      if (AppConfig.humeConfigId.isNotEmpty) {
        params.write('&config_id=${AppConfig.humeConfigId}');
      }
      final uri = Uri.parse('wss://api.hume.ai/v0/evi/chat?$params');
      _channel = WebSocketChannel.connect(uri);
      await _channel!.ready;

      // Configure raw-PCM input (linear16) per the EVI audio guide.
      _send({
        'type': 'session_settings',
        'audio': {'format': 'linear16', 'sample_rate': 16000, 'channels': 1},
      });

      _wsSub = _channel!.stream.listen(_onMessage, onError: (e) => _fail('$e'), onDone: () {
        if (phase == VoicePhase.talking) _setPhase(VoicePhase.saved);
      });

      _playerSub = _player.onPlayerComplete.listen((_) {
        _playing = false;
        _drainAudio();
      });

      await _startMic();
      _setPhase(VoicePhase.talking);
    } catch (e) {
      _fail('$e');
    }
  }

  Future<String?> _authQuery() async {
    // Preferred: short-lived access token from your backend (keys never on device).
    if (AppConfig.humeTokenEndpoint.isNotEmpty) {
      try {
        final res = await http
            .get(Uri.parse(AppConfig.humeTokenEndpoint))
            .timeout(const Duration(seconds: 8));
        if (res.statusCode == 200) {
          final token = (jsonDecode(res.body) as Map)['access_token'];
          if (token is String && token.isNotEmpty) return 'access_token=$token';
        }
      } catch (_) {}
    }
    if (AppConfig.humeApiKey.isNotEmpty) return 'api_key=${AppConfig.humeApiKey}';
    return null;
  }

  Future<void> _startMic() async {
    final stream = await _recorder.startStream(const RecordConfig(
      encoder: AudioEncoder.pcm16bits,
      sampleRate: 16000,
      numChannels: 1,
    ));
    _micSub = stream.listen((chunk) {
      if (_channel == null) return;
      _send({'type': 'audio_input', 'data': base64Encode(chunk)});
    });
  }

  void _send(Map<String, dynamic> msg) => _channel?.sink.add(jsonEncode(msg));

  void _onMessage(dynamic raw) {
    Map<String, dynamic> msg;
    try {
      msg = Map<String, dynamic>.from(jsonDecode(raw as String));
    } catch (_) {
      return;
    }
    switch (msg['type']) {
      case 'user_message':
        _handleUserMessage(msg);
        break;
      case 'assistant_message':
        final text = msg['message']?['content']?.toString() ?? '';
        if (text.isNotEmpty) _addTurn(ConvTurn('ai', text));
        _setMode(RingMode.ai);
        emotion = null;
        break;
      case 'audio_output':
        final data = msg['data'];
        if (data is String && data.isNotEmpty) _enqueueAudio(base64Decode(data));
        break;
      case 'assistant_end':
        _setMode(RingMode.idle);
        break;
      case 'tool_call':
        _handleToolCall(msg);
        break;
      case 'user_interruption':
        _stopPlayback();
        break;
      case 'error':
        _fail(msg['message']?.toString() ?? 'EVI error');
        break;
    }
  }

  void _handleUserMessage(Map<String, dynamic> msg) {
    final content = msg['message']?['content']?.toString() ?? '';
    final scores = _extractScores(msg);

    // PRIMARY safety gate — deterministic, before any AI processing.
    if (content.isNotEmpty && _safety.checkSafety(content)) {
      _triggerSafety();
      return;
    }
    if (_safety.checkEmotionSafety(scores)) {
      _triggerSafety();
      return;
    }

    if (content.isNotEmpty) {
      _lastSnapshot = EmotionSnapshot(
        distress: scores['Distress'] ?? 0,
        sadness: scores['Sadness'] ?? 0,
        fear: scores['Fear'] ?? 0,
        calmness: scores['Calmness'] ?? 0,
      );
      emotion = _emotionLabel(scores);
      userTurns += 1;
      _setMode(RingMode.user);
      _addTurn(ConvTurn('user', content, emotion));

      // SECONDARY async classifier — only adds detections, never blocks.
      _safety.classifyCrisis(content).then((flag) {
        if (flag && !_disposed && phase == VoicePhase.talking) _triggerSafety();
      });
    }
  }

  Map<String, double> _extractScores(Map<String, dynamic> msg) {
    final raw = msg['models']?['prosody']?['scores'];
    final out = <String, double>{};
    if (raw is Map) {
      raw.forEach((k, v) {
        if (v is num) out[k.toString()] = v.toDouble();
      });
    }
    return out;
  }

  String? _emotionLabel(Map<String, double> s) {
    if (s.isEmpty) return null;
    final distress = (s['Distress'] ?? 0) + (s['Fear'] ?? 0) + (s['Sadness'] ?? 0);
    if (distress > 0.5) return 'Distressed';
    if ((s['Tiredness'] ?? 0) > 0.4) return 'Tired';
    if ((s['Anxiety'] ?? s['Fear'] ?? 0) > 0.4) return 'Anxious';
    if ((s['Calmness'] ?? 0) > 0.4) return 'Calm';
    return null;
  }

  void _handleToolCall(Map<String, dynamic> msg) {
    if (msg['name'] != 'store_symptom_entry') return;
    Map<String, dynamic> args = {};
    try {
      final p = msg['parameters'];
      args = Map<String, dynamic>.from(p is String ? jsonDecode(p) : (p ?? {}));
    } catch (_) {}
    if (_stored) return;
    _stored = true;
    final transcript = turns.map((t) => '${t.role == 'ai' ? 'CycleSignal' : 'Amara'}: ${t.text}').join('\n');
    final entry = _extractor.buildFromToolArgs(
      args,
      transcript: transcript,
      cycleDay: cycleDay,
      cycleNumber: cycleNumber,
      consentTimestamp: consentTimestamp,
      emotionSnapshot: _lastSnapshot,
    );
    onStored(entry);
    // Acknowledge the tool call so EVI can close the turn naturally.
    final id = msg['tool_call_id'];
    if (id != null) {
      _send({
        'type': 'tool_response',
        'tool_call_id': id,
        'content': 'Stored.',
      });
    }
  }

  // --- audio playback queue (sequential WAV chunks) ---
  void _enqueueAudio(Uint8List bytes) {
    _audioQueue.add(bytes);
    _drainAudio();
  }

  Future<void> _drainAudio() async {
    if (_playing || _audioQueue.isEmpty || _disposed) return;
    _playing = true;
    final bytes = _audioQueue.removeAt(0);
    try {
      await _player.play(BytesSource(bytes));
    } catch (_) {
      _playing = false;
      _drainAudio();
    }
  }

  Future<void> _stopPlayback() async {
    _audioQueue.clear();
    try {
      await _player.stop();
    } catch (_) {}
    _playing = false;
  }

  void _triggerSafety() {
    _teardown();
    onSafety();
  }

  // Finalize on natural end if EVI never fired the tool call (fallback extraction).
  Future<void> finishAndStore() async {
    if (_stored) {
      _setPhase(VoicePhase.saved);
      return;
    }
    final transcript =
        turns.map((t) => '${t.role == 'ai' ? 'CycleSignal' : 'Amara'}: ${t.text}').join('\n');
    if (transcript.trim().isEmpty) {
      await stop();
      return;
    }
    _stored = true;
    final entry = await _extractor.extract(
      transcript: transcript,
      cycleDay: cycleDay,
      cycleNumber: cycleNumber,
      consentTimestamp: consentTimestamp,
      emotionSnapshot: _lastSnapshot,
      source: 'voice',
    );
    onStored(entry);
    _setPhase(VoicePhase.saved);
  }

  Future<void> stop() async => _teardown();

  Future<void> _teardown() async {
    await _micSub?.cancel();
    try {
      await _recorder.stop();
    } catch (_) {}
    await _stopPlayback();
    await _wsSub?.cancel();
    try {
      await _channel?.sink.close();
    } catch (_) {}
    _channel = null;
  }

  void _fail(String message) {
    errorMessage = message;
    _setPhase(VoicePhase.error);
    _teardown();
  }

  void _addTurn(ConvTurn t) {
    turns.add(t);
    if (!_disposed) notifyListeners();
  }

  void _setMode(RingMode m) {
    mode = m;
    if (!_disposed) notifyListeners();
  }

  void _setPhase(VoicePhase p) {
    phase = p;
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    _playerSub?.cancel();
    _teardown();
    _player.dispose();
    _recorder.dispose();
    super.dispose();
  }
}
