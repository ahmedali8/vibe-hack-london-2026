import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../logic/cycle.dart';

const _cell = 15.0;
const _gap = 3.0;
const _step = _cell + _gap;
const _labelW = 84.0;

/// Cycle timeline heatmap — calm pastel grid of cycles × days.
/// Tap a cell for a soft detail tooltip.
class HeatmapWidget extends StatefulWidget {
  final List<Cycle> cycles;
  final Heatmap heatmap;
  const HeatmapWidget({super.key, required this.cycles, required this.heatmap});
  @override
  State<HeatmapWidget> createState() => _HeatmapWidgetState();
}

class _HeatmapWidgetState extends State<HeatmapWidget> {
  Cell? _selected;

  @override
  Widget build(BuildContext context) {
    if (widget.cycles.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: Text('No cycles tracked yet.', style: AppText.body(AppColors.textMuted)),
      );
    }
    final days = List.generate(widget.heatmap.maxDay, (i) => i + 1);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Wrap(spacing: 14, runSpacing: 8, children: [
          _Legend(AppColors.cellBleeding, 'Bleeding'),
          _Legend(AppColors.cellMoodHigh, 'Low mood'),
          _Legend(AppColors.cellPhysical, 'Physical'),
        ]),
        const SizedBox(height: 14),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Fixed cycle labels.
            SizedBox(
              width: _labelW,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 16),
                  ...widget.cycles.map((c) => SizedBox(
                        height: _step,
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: Text('Cycle ${c.cycleNumber}',
                              overflow: TextOverflow.ellipsis,
                              style: AppText.caption(c.isIrregular
                                  ? AppColors.accentAmber
                                  : AppColors.textSecondary)),
                        ),
                      )),
                ],
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: days
                          .map((d) => SizedBox(
                                width: _step,
                                height: 16,
                                child: Center(
                                  child: (d == 1 || d % 5 == 0)
                                      ? Text('$d',
                                          style: AppText.caption(AppColors.textMuted)
                                              .copyWith(fontSize: 9))
                                      : const SizedBox.shrink(),
                                ),
                              ))
                          .toList(),
                    ),
                    ...widget.heatmap.rows.map((cells) => Row(
                          children: cells.map((cell) {
                            final isSel = _selected?.cycleNumber == cell.cycleNumber &&
                                _selected?.cycleDay == cell.cycleDay;
                            final bg = cell.category == CellCategory.none && cell.premenstrual
                                ? AppColors.premenstrualOverlay
                                : cell.color;
                            return GestureDetector(
                              onTap: () => setState(() => _selected = cell),
                              child: SizedBox(
                                width: _step,
                                height: _step,
                                child: Center(
                                  child: Container(
                                    width: _cell,
                                    height: _cell,
                                    decoration: BoxDecoration(
                                      color: bg,
                                      borderRadius: BorderRadius.circular(AppRadius.cell),
                                      border: isSel
                                          ? Border.all(color: AppColors.ink, width: 1.5)
                                          : null,
                                    ),
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        )),
                  ],
                ),
              ),
            ),
          ],
        ),
        if (_selected != null) _Tooltip(_selected!),
      ],
    );
  }
}

class _Legend extends StatelessWidget {
  final Color color;
  final String label;
  const _Legend(this.color, this.label);
  @override
  Widget build(BuildContext context) {
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Container(
          width: 11,
          height: 11,
          decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(3))),
      const SizedBox(width: 6),
      Text(label, style: AppText.caption(AppColors.textSecondary)),
    ]);
  }
}

class _Tooltip extends StatelessWidget {
  final Cell cell;
  const _Tooltip(this.cell);
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 16),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.bgElevated,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Cycle ${cell.cycleNumber} · Day ${cell.cycleDay}',
              style: AppText.label(AppColors.textPrimary)),
          if (cell.entry != null) ...[
            const SizedBox(height: 2),
            Text(prettyDate(cell.entry!.date), style: AppText.caption()),
            const SizedBox(height: 4),
            ...describeEntry(cell.entry!).map((s) => Text('• $s', style: AppText.label())),
          ] else
            Text('No data logged on this day.', style: AppText.label()),
          if (cell.premenstrual)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text('Within premenstrual window',
                  style: AppText.caption(AppColors.accentViolet)),
            ),
        ],
      ),
    );
  }
}
