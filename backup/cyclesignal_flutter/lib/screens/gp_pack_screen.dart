import 'package:flutter/material.dart';
import 'package:printing/printing.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../state/app_state.dart';
import '../logic/gp_data.dart';
import '../logic/patterns.dart';
import '../widgets/primitives.dart';
import '../pdf/gp_pack_pdf.dart';

const _sectionLabels = {
  'patientStatement': 'Patient statement',
  'cycleOverview': 'Cycle overview',
  'symptomTimeline': 'Symptom timeline (heatmap)',
  'symptomSummary': 'Symptom summary table',
  'functionalImpact': 'Functional impact',
  'pcosPoints': 'PCOS discussion points',
  'pmddPoints': 'PMDD discussion points',
  'redFlags': 'Red flags (if triggered)',
};

class GpPackScreen extends StatefulWidget {
  final VoidCallback onOpenPrivacy;
  const GpPackScreen({super.key, required this.onOpenPrivacy});
  @override
  State<GpPackScreen> createState() => _GpPackScreenState();
}

class _GpPackScreenState extends State<GpPackScreen> {
  late TextEditingController _statement;
  bool _exporting = false;

  @override
  void initState() {
    super.initState();
    _statement = TextEditingController(text: context.read<AppState>().statement);
  }

  @override
  void dispose() {
    _statement.dispose();
    super.dispose();
  }

  Future<void> _export(AppState app, GPData data) async {
    setState(() => _exporting = true);
    try {
      await app.updateStatement(_statement.text);
      final bytes = await buildGpPackPdf(
        statement: _statement.text,
        data: data,
        pattern: app.pattern,
        toggles: app.toggles,
        cycles: app.cycles,
        heatmap: app.heatmap,
      );
      await Printing.sharePdf(bytes: bytes, filename: 'cyclesignal_gp_pack.pdf');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Export failed: $e')));
      }
    } finally {
      if (mounted) setState(() => _exporting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final flags = app.pattern?.flags ?? analysePatterns(app.entries);
    final data = computeGPData(app.entries, app.cycles, flags);

    return SafeArea(
      bottom: false,
      child: Column(
        children: [
          TopBar(onLock: widget.onOpenPrivacy),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text('GP Evidence Pack', style: AppText.display()),
                Text('A one-page summary you control, for your clinician.', style: AppText.label()),
                const SizedBox(height: 16),
                AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('PATIENT STATEMENT', style: AppText.overline()),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _statement,
                        maxLines: 3,
                        style: AppText.body(AppColors.textPrimary),
                        decoration: InputDecoration(
                          filled: true,
                          fillColor: AppColors.bgElevated,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: BorderSide.none,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('INCLUDE IN PACK', style: AppText.overline()),
                      const SizedBox(height: 4),
                      ..._sectionLabels.entries.map((e) => Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(child: Text(e.value, style: AppText.body(AppColors.textPrimary))),
                              AppToggle(
                                value: app.toggles[e.key] ?? true,
                                onChanged: (v) => app.setToggle(e.key, v),
                              ),
                            ],
                          )),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(children: [
                            const Icon(Icons.lock_outline, size: 14, color: AppColors.textMuted),
                            const SizedBox(width: 6),
                            Text('Disclaimer (always included)',
                                style: AppText.body(AppColors.textMuted)),
                          ]),
                          const AppToggle(value: true, onChanged: null),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Text('PREVIEW', style: AppText.overline()),
                const SizedBox(height: 8),
                _DocPreview(app: app, data: data, statement: _statement.text),
                const SizedBox(height: 16),
                PrimaryButton(
                  label: _exporting ? 'Generating…' : 'Download GP Pack',
                  icon: Icons.download,
                  fullWidth: true,
                  onPressed: _exporting ? null : () => _export(app, data),
                ),
                const SizedBox(height: 8),
                Center(
                  child: Text('Generated on your device. Nothing is sent to a server.',
                      style: AppText.caption()),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DocPreview extends StatelessWidget {
  final AppState app;
  final GPData data;
  final String statement;
  const _DocPreview({required this.app, required this.data, required this.statement});

  @override
  Widget build(BuildContext context) {
    final t = app.toggles;
    TextStyle h() => AppText.body(const Color(0xFF111827)).copyWith(fontWeight: FontWeight.w600, fontSize: 12);
    TextStyle b() => AppText.body(const Color(0xFF374151)).copyWith(fontSize: 11);

    Widget section(String title, List<Widget> children) => Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.only(bottom: 3),
                margin: const EdgeInsets.only(bottom: 5),
                decoration: const BoxDecoration(
                    border: Border(bottom: BorderSide(color: AppColors.pdfBorder))),
                child: Text(title, style: h()),
              ),
              ...children,
            ],
          ),
        );

    Widget kv(String k, String v) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 1),
          child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text(k, style: b().copyWith(color: const Color(0xFF6B7280))),
            Text(v, style: b().copyWith(fontWeight: FontWeight.w500)),
          ]),
        );

    return Container(
      decoration: BoxDecoration(
        color: AppColors.docWhite,
        borderRadius: BorderRadius.circular(8),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 12)],
      ),
      padding: const EdgeInsets.all(22),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('CycleSignal AI — GP Evidence Pack',
              style: AppText.body(const Color(0xFF111827)).copyWith(fontWeight: FontWeight.w600, fontSize: 16)),
          if (app.pattern != null && app.pattern!.labels.isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF5F3FF),
                borderRadius: BorderRadius.circular(4),
                border: const Border(left: BorderSide(color: AppColors.accentViolet, width: 3)),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(app.pattern!.labels.first, style: h()),
                if (app.pattern!.narrative.isNotEmpty) ...[
                  const SizedBox(height: 3),
                  Text(app.pattern!.narrative, style: b()),
                ],
              ]),
            ),
          ],
          const SizedBox(height: 12),
          if (t['patientStatement'] == true) section('Patient statement', [Text(statement, style: b())]),
          if (t['cycleOverview'] == true)
            section('Cycle overview', [
              kv('Cycles tracked', '${data.cyclesTracked}'),
              kv('Average cycle length', '${data.avgLength} days'),
              kv('Range', data.range),
              kv('Cycles > 35 days', '${data.cyclesOver35}'),
            ]),
          if (t['symptomTimeline'] == true)
            section('Symptom timeline',
                [Text('Colour heatmap of all cycles is embedded in the exported PDF.', style: b().copyWith(fontStyle: FontStyle.italic, color: AppColors.pdfMuted))]),
          if (t['symptomSummary'] == true)
            section('Symptom summary',
                data.symptomRows.map((r) => kv(r.name, '${r.cycles} cycles · ${r.window}')).toList()),
          if (t['functionalImpact'] == true)
            section('Functional impact', [Text(data.functionalText, style: b())]),
          if (t['pcosPoints'] == true && data.pcosPoints.isNotEmpty)
            section('PCOS-relevant discussion points',
                data.pcosPoints.map((p) => Text('• $p', style: b())).toList()),
          if (t['pmddPoints'] == true && data.pmddPoints.isNotEmpty)
            section('PMDD-relevant discussion points',
                data.pmddPoints.map((p) => Text('• $p', style: b())).toList()),
          if (t['redFlags'] == true && data.redFlag)
            Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.only(left: 10),
              decoration: const BoxDecoration(
                  border: Border(left: BorderSide(color: AppColors.safetyRed, width: 4))),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Red flags', style: h()),
                Text('The user has reported symptoms that may warrant urgent mental health support.',
                    style: b()),
              ]),
            ),
          Container(
            margin: const EdgeInsets.only(top: 8),
            padding: const EdgeInsets.only(top: 8),
            decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppColors.pdfBorder))),
            child: Text(
              'This summary was prepared by the user using CycleSignal AI, a symptom-tracking tool. It is not a clinical diagnosis. It is not medical advice. It is intended solely to support a conversation with a clinician. CycleSignal AI is not a registered medical device.',
              style: AppText.caption(AppColors.pdfMuted).copyWith(fontSize: 8),
            ),
          ),
        ],
      ),
    );
  }
}
