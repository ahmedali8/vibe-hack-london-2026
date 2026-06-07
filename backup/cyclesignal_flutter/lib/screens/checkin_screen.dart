import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../state/app_state.dart';
import '../services/config.dart';
import '../services/hume_voice_service.dart';
import '../services/safety_service.dart';
import '../services/extraction_service.dart';
import '../models/cycle_entry.dart';
import '../logic/phase.dart';
import '../logic/conversation.dart';
import '../widgets/listening_ring.dart';
import '../widgets/emotion_pill.dart';
import '../widgets/safety_sheet.dart';

class CheckInScreen extends StatefulWidget {
  const CheckInScreen({super.key});
  @override
  State<CheckInScreen> createState() => _CheckInScreenState();
}

class _CheckInScreenState extends State<CheckInScreen> {
  HumeVoiceService? _voice; // live path
  final _noteCtrl = TextEditingController();
  final _safety = SafetyService();
  final _extractor = ExtractionService();

  // shared context
  late int _cycleDay;
  late int _cycleNumber;
  late String _consent;

  // offline-path state
  String _phase = 'connecting'; // connecting|talking|saved|error
  RingMode _mode = RingMode.ai;
  String? _emotion;
  final List<ConvTurn> _revealed = [];
  int _userTurns = 0;
  final List<String> _notes = [];
  Timer? _timer;
  bool _cancelled = false;
  int _played = 0;

  bool _closing = false;
  bool _safetyShown = false;

  bool get _live => _voice != null;

  @override
  void initState() {
    super.initState();
    final app = context.read<AppState>();
    final pos = currentPosition(app.cycles);
    _cycleDay = pos.cycleDay;
    _cycleNumber = app.cycles.isNotEmpty ? app.cycles.last.cycleNumber : 1;
    _consent = app.consentTimestamp ?? DateTime.now().toIso8601String();

    if (AppConfig.hasHume) {
      _voice = HumeVoiceService(
        cycleDay: _cycleDay,
        cycleNumber: _cycleNumber,
        consentTimestamp: _consent,
        onStored: (entry) => context.read<AppState>().addCheckIn(entry),
        onSafety: _showSafety,
      )..addListener(_onVoice);
      _voice!.start();
    } else {
      _startOffline();
    }
  }

  void _onVoice() {
    if (!mounted) return;
    setState(() {});
    if (_voice!.phase == VoicePhase.saved) _scheduleClose();
  }

  // --- offline scripted path (no Hume key configured) ---
  void _startOffline() {
    setState(() => _phase = 'connecting');
    _timer = Timer(const Duration(milliseconds: 1300), () {
      if (_cancelled) return;
      setState(() => _phase = 'talking');
      _playStep(0);
    });
  }

  void _playStep(int i) {
    if (_cancelled || !mounted) return;
    if (i >= checkinScript.length) {
      _finishOffline();
      return;
    }
    final turn = checkinScript[i];
    if (_safety.checkSafety(turn.text)) {
      _showSafety();
      return;
    }
    _played = i + 1;
    setState(() {
      _revealed.add(turn);
      _mode = turn.role == 'ai' ? RingMode.ai : RingMode.user;
      _emotion = turn.role == 'user' ? turn.emotion : null;
      if (turn.role == 'user') _userTurns++;
    });
    _timer = Timer(Duration(milliseconds: dwellMsFor(turn)), () => _playStep(i + 1));
  }

  Future<void> _finishOffline() async {
    _timer?.cancel();
    setState(() => _mode = RingMode.idle);
    final transcript = checkinScript
        .take(_played)
        .map((t) => '${t.role == 'ai' ? 'CycleSignal' : 'Amara'}: ${t.text}')
        .followedBy(_notes.map((n) => 'Amara: $n'))
        .join('\n');
    final entry = await _extractor.extract(
      transcript: transcript,
      cycleDay: _cycleDay,
      cycleNumber: _cycleNumber,
      consentTimestamp: _consent,
      emotionSnapshot: EmotionSnapshot(distress: 0.35, sadness: 0.25, fear: 0.05, calmness: 0.3),
      source: 'voice',
    );
    if (!mounted) return;
    await context.read<AppState>().addCheckIn(entry);
    setState(() => _phase = 'saved');
    _scheduleClose();
  }

  void _scheduleClose() {
    if (_closing) return;
    _closing = true;
    Timer(const Duration(milliseconds: 1700), () {
      if (mounted) Navigator.of(context).maybePop();
    });
  }

  Future<void> _showSafety() async {
    if (_safetyShown) return;
    _safetyShown = true;
    _cancelled = true;
    _timer?.cancel();
    await _voice?.stop();
    if (!mounted) return;
    await showSafety(context, onClose: () {
      if (mounted) Navigator.of(context).maybePop();
    });
  }

  void _submitNote() {
    final text = _noteCtrl.text.trim();
    if (text.isEmpty) return;
    _noteCtrl.clear();
    // Hard-coded safety check on every text input — PRD Feature 5 / Constraint #2.
    if (_safety.checkSafety(text)) {
      _showSafety();
      return;
    }
    // Secondary async classifier (non-blocking).
    _safety.classifyCrisis(text).then((flag) {
      if (flag && mounted) _showSafety();
    });
    if (!_live) {
      setState(() => _notes.add(text));
      setState(() => _revealed.add(ConvTurn('user', text)));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Noted.')));
    }
  }

  void _confirmEnd() {
    final isTalking = (_live ? _voice!.phase == VoicePhase.talking : _phase == 'talking');
    if (!isTalking) {
      _cancelled = true;
      Navigator.of(context).maybePop();
      return;
    }
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('End check-in?'),
        content: const Text('Your progress will be saved.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Keep talking')),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              if (_live) {
                _voice!.finishAndStore();
              } else {
                _cancelled = true;
                _finishOffline();
              }
            },
            child: const Text('End', style: TextStyle(color: AppColors.accentRose)),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _cancelled = true;
    _timer?.cancel();
    _noteCtrl.dispose();
    _voice?.removeListener(_onVoice);
    _voice?.dispose();
    super.dispose();
  }

  // unified getters
  String get _phaseStr {
    if (!_live) return _phase;
    switch (_voice!.phase) {
      case VoicePhase.connecting:
        return 'connecting';
      case VoicePhase.talking:
        return 'talking';
      case VoicePhase.saved:
        return 'saved';
      case VoicePhase.error:
        return 'error';
    }
  }

  RingMode get _curMode => _live ? _voice!.mode : _mode;
  List<ConvTurn> get _turns => _live ? _voice!.turns : _revealed;
  int get _curUserTurns => _live ? _voice!.userTurns : _userTurns;
  String? get _curEmotion {
    final e = _live ? _voice!.emotion : _emotion;
    return _curMode == RingMode.ai ? null : e;
  }

  @override
  Widget build(BuildContext context) {
    final phase = _phaseStr;
    final visible = _turns.length > 4 ? _turns.sublist(_turns.length - 4) : _turns;

    return Scaffold(
      backgroundColor: AppColors.bgBase,
      body: Container(
        color: AppColors.bgBase,
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                child: Row(
                  children: [
                    const Spacer(),
                    EmotionPill(emotion: _curEmotion),
                    IconButton(
                      onPressed: _confirmEnd,
                      icon: const Icon(Icons.close, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
              if (phase == 'connecting')
                const Expanded(
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CircularProgressIndicator(),
                        SizedBox(height: 12),
                        Text('Connecting…'),
                      ],
                    ),
                  ),
                )
              else if (phase == 'error')
                Expanded(
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.error_outline, color: AppColors.accentAmber, size: 36),
                          const SizedBox(height: 12),
                          Text(_voice?.errorMessage ?? 'Voice unavailable',
                              textAlign: TextAlign.center, style: AppText.body()),
                          const SizedBox(height: 12),
                          Text(
                            'Configure HUME_API_KEY (or HUME_TOKEN_ENDPOINT) to enable live EVI 3 voice.',
                            textAlign: TextAlign.center,
                            style: AppText.caption(),
                          ),
                        ],
                      ),
                    ),
                  ),
                )
              else if (phase == 'saved')
                Expanded(
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 88,
                          height: 88,
                          decoration: BoxDecoration(
                            color: AppColors.accentRoseGlow,
                            shape: BoxShape.circle,
                            border: Border.all(color: AppColors.accentRose, width: 2),
                          ),
                          child: const Icon(Icons.check, color: AppColors.accentRose, size: 40),
                        ),
                        const SizedBox(height: 12),
                        Text('Check-in saved', style: AppText.display()),
                        Text('Your timeline has been updated.', style: AppText.body()),
                      ],
                    ),
                  ),
                )
              else ...[
                Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      ListeningRing(mode: _curMode),
                      const SizedBox(height: 18),
                      Text(_curMode == RingMode.ai ? 'CycleSignal is speaking…' : 'Listening…',
                          style: AppText.label(AppColors.textMuted)),
                      const SizedBox(height: 24),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 28),
                        child: Column(
                          children: visible
                              .map((t) => Padding(
                                    padding: const EdgeInsets.only(bottom: 8),
                                    child: Text(
                                      t.text,
                                      textAlign: TextAlign.center,
                                      style: AppText.body(t.role == 'ai'
                                          ? AppColors.accentViolet
                                          : AppColors.textPrimary),
                                    ),
                                  ))
                              .toList(),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text('Turn ${_curUserTurns.clamp(1, totalUserTurns)} of $totalUserTurns',
                          style: AppText.caption()),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _noteCtrl,
                          textInputAction: TextInputAction.send,
                          onSubmitted: (_) => _submitNote(),
                          decoration: InputDecoration(
                            hintText: "Type how you're feeling instead…",
                            filled: true,
                            fillColor: AppColors.bgSurface,
                            contentPadding:
                                const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(100),
                              borderSide: const BorderSide(color: AppColors.borderSubtle),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(100),
                              borderSide: const BorderSide(color: AppColors.borderSubtle),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      IconButton.filled(
                        onPressed: _submitNote,
                        style: IconButton.styleFrom(backgroundColor: AppColors.bgSurface),
                        icon: const Icon(Icons.send, color: AppColors.accentRose, size: 20),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
