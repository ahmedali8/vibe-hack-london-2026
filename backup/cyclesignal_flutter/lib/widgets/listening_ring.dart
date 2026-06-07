import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../services/hume_voice_service.dart' show RingMode;

/// Calm voice indicator — a single soft circle that breathes gently.
/// ai: lavender. user/idle: rose. No concentric rings or glows.
class ListeningRing extends StatefulWidget {
  final RingMode mode;
  const ListeningRing({super.key, required this.mode});
  @override
  State<ListeningRing> createState() => _ListeningRingState();
}

class _ListeningRingState extends State<ListeningRing>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
      vsync: this, duration: const Duration(milliseconds: 2400))
    ..repeat(reverse: true);

  @override
  void didUpdateWidget(covariant ListeningRing old) {
    super.didUpdateWidget(old);
    final ms = widget.mode == RingMode.user ? 1400 : 2400;
    if (_c.duration!.inMilliseconds != ms) {
      _c.duration = Duration(milliseconds: ms);
      _c
        ..reset()
        ..repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tone = widget.mode == RingMode.ai ? AppColors.lavender : AppColors.rose;
    final toneSoft =
        widget.mode == RingMode.ai ? AppColors.lavenderMuted : AppColors.roseMuted;
    return SizedBox(
      width: 180,
      height: 180,
      child: AnimatedBuilder(
        animation: _c,
        builder: (_, __) {
          final scale = 1 + 0.06 * _c.value;
          return Center(
            child: Transform.scale(
              scale: scale,
              child: Container(
                width: 150,
                height: 150,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: toneSoft,
                  border: Border.all(color: tone, width: 2),
                ),
                child: const Icon(Icons.mic_none_rounded, size: 40, color: AppColors.ink),
              ),
            ),
          );
        },
      ),
    );
  }
}
