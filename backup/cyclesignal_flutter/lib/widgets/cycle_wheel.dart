import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Period wheel — a rotating dial of cycle-day dots coloured by phase, with a
/// fixed top pointer and a fixed centre summary. Ported from ovara-mobile's
/// CycleWheel. Drag the wheel to scrub through days; it snaps to the nearest
/// day under the pointer.
enum WheelPhase { menstrual, follicular, ovulatory, luteal }

class _Range {
  final WheelPhase key;
  final int start;
  final int end;
  const _Range(this.key, this.start, this.end);
}

// Phase boundaries (ovara's model): ovulation anchored 14 days before the end.
List<_Range> _phaseRanges(int cycleLength, int periodLength) {
  final ovulation = cycleLength - 14;
  final upper = math.max(1, ovulation - 3);
  final periodEnd = periodLength.clamp(1, upper);
  return [
    _Range(WheelPhase.menstrual, 1, periodEnd),
    _Range(WheelPhase.follicular, periodEnd + 1, ovulation - 2),
    _Range(WheelPhase.ovulatory, ovulation - 1, ovulation + 1),
    _Range(WheelPhase.luteal, ovulation + 2, cycleLength),
  ];
}

WheelPhase phaseForDay(int day, int cycleLength, int periodLength) {
  for (final r in _phaseRanges(cycleLength, periodLength)) {
    if (day >= r.start && day <= r.end) return r.key;
  }
  return WheelPhase.menstrual;
}

class WheelPhaseStyle {
  final Color color;
  final Color border;
  final String emoji;
  final String label;
  final String blurb;
  const WheelPhaseStyle(this.color, this.border, this.emoji, this.label, this.blurb);
}

const Map<WheelPhase, WheelPhaseStyle> phaseStyles = {
  WheelPhase.menstrual: WheelPhaseStyle(AppColors.rose, Color(0xB3F0C4BE), '🌙',
      'Menstrual phase', 'Slow down. Warm food, gentle stretches, lots of rest.'),
  WheelPhase.follicular: WheelPhaseStyle(AppColors.sage, Color(0x66C8DBC9), '🌱',
      'Follicular phase', 'Energy is rising. A lovely time to move.'),
  WheelPhase.ovulatory: WheelPhaseStyle(AppColors.lavender, Color(0x59D4C4E9), '✨',
      'Ovulatory phase', 'Feeling bright? Channel it into something you love.'),
  WheelPhase.luteal: WheelPhaseStyle(AppColors.amber, Color(0x80EDD8A0), '🌸',
      'Luteal phase', 'Settle inward. Cozy food and softer workouts.'),
};

class CycleWheel extends StatefulWidget {
  final int cycleLength;
  final int periodLength;
  final int todayDay;
  const CycleWheel({
    super.key,
    required this.cycleLength,
    required this.periodLength,
    required this.todayDay,
  });

  @override
  State<CycleWheel> createState() => _CycleWheelState();
}

class _CycleWheelState extends State<CycleWheel> {
  late double _rotation; // degrees
  late int _selectedDay;
  double _prevAngle = 0;

  double get _step => 360 / widget.cycleLength;
  int get _today => widget.todayDay.clamp(1, widget.cycleLength);

  @override
  void initState() {
    super.initState();
    _reset();
  }

  @override
  void didUpdateWidget(CycleWheel old) {
    super.didUpdateWidget(old);
    if (old.cycleLength != widget.cycleLength ||
        old.todayDay != widget.todayDay ||
        old.periodLength != widget.periodLength) {
      setState(_reset);
    }
  }

  void _reset() {
    _selectedDay = _today;
    _rotation = -(_selectedDay - 1) * _step;
  }

  int _dayFromRotation() {
    final n = widget.cycleLength;
    var idx = (-_rotation / _step).round() % n;
    if (idx < 0) idx += n;
    return idx + 1;
  }

  void _onPanStart(DragStartDetails d, double center) {
    _prevAngle =
        math.atan2(d.localPosition.dy - center, d.localPosition.dx - center) * 180 / math.pi;
  }

  void _onPanUpdate(DragUpdateDetails d, double center) {
    final cur =
        math.atan2(d.localPosition.dy - center, d.localPosition.dx - center) * 180 / math.pi;
    var delta = cur - _prevAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    _prevAngle = cur;
    setState(() {
      _rotation += delta;
      _selectedDay = _dayFromRotation();
    });
  }

  void _onPanEnd(DragEndDetails d) {
    final n = widget.cycleLength;
    final idx = (-_rotation / _step).round();
    setState(() {
      _rotation = -idx * _step; // snap so the day sits exactly under the pointer
      var day = idx % n;
      if (day < 0) day += n;
      _selectedDay = day + 1;
    });
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final size = math.min(constraints.maxWidth, 320.0);
        final center = size / 2;
        final dayRadius = center - 22;
        const dot = 18.0;
        final n = widget.cycleLength;
        final rot = _rotation * math.pi / 180;
        final selected =
            phaseStyles[phaseForDay(_selectedDay, widget.cycleLength, widget.periodLength)]!;

        final dots = <Widget>[];
        for (var i = 0; i < n; i++) {
          final day = i + 1;
          final st = phaseStyles[phaseForDay(day, widget.cycleLength, widget.periodLength)]!;
          final a = (-90 + i * _step) * math.pi / 180;
          final x = center + dayRadius * math.cos(a);
          final y = center + dayRadius * math.sin(a);
          final isToday = day == _today;
          final isSelected = day == _selectedDay;
          dots.add(Positioned(
            left: x - dot / 2,
            top: y - dot / 2,
            child: Transform.scale(
              scale: isSelected ? 1.25 : 1,
              child: Container(
                width: dot,
                height: dot,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: st.color,
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: (isSelected || isToday) ? AppColors.ink : st.border,
                    width: isSelected ? 2.5 : (isToday ? 2 : 1.5),
                  ),
                ),
                // Counter-rotate so the day number stays upright inside the dial.
                child: isSelected
                    ? Transform.rotate(
                        angle: -rot,
                        child: Text('$day',
                            style: AppText.caption(AppColors.ink)
                                .copyWith(fontSize: 9, fontWeight: FontWeight.w700)),
                      )
                    : null,
              ),
            ),
          ));
        }

        return Column(
          children: [
            SizedBox(
              width: size,
              height: size,
              child: GestureDetector(
                onPanStart: (d) => _onPanStart(d, center),
                onPanUpdate: (d) => _onPanUpdate(d, center),
                onPanEnd: _onPanEnd,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    // Rotating dial of day dots.
                    Transform.rotate(
                      angle: rot,
                      child: SizedBox(width: size, height: size, child: Stack(children: dots)),
                    ),
                    // Fixed pointer marking the selected day at the top.
                    Positioned(
                      top: -4,
                      left: 0,
                      right: 0,
                      child: const Center(
                        child: Icon(Icons.arrow_drop_down, size: 30, color: AppColors.ink),
                      ),
                    ),
                    // Fixed centre summary (does not rotate).
                    IgnorePointer(
                      child: SizedBox(
                        width: size * 0.55,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(selected.emoji, style: const TextStyle(fontSize: 42)),
                            const SizedBox(height: 4),
                            Text('DAY $_selectedDay OF ${widget.cycleLength}',
                                style: AppText.overline()),
                            const SizedBox(height: 2),
                            Text(selected.label,
                                style: AppText.serifTitle(), textAlign: TextAlign.center),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 18),
            Text(selected.blurb, textAlign: TextAlign.center, style: AppText.body()),
            if (_selectedDay != _today) ...[
              const SizedBox(height: 10),
              TextButton(
                onPressed: () => setState(_reset),
                child: Text('Back to today',
                    style: AppText.label(AppColors.ink)
                        .copyWith(decoration: TextDecoration.underline)),
              ),
            ],
          ],
        );
      },
    );
  }
}
