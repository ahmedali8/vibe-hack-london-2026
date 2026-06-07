import 'dart:typed_data';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

import '../logic/cycle.dart';
import '../logic/gp_data.dart';
import '../models/pattern.dart';

/// GP Evidence Pack PDF — PRD Feature 4 / Section 5.7. Generated entirely on-device
/// (the `pdf` package), shared via the `printing` package. Nothing is sent to a
/// server (Constraint #4). The disclaimer is always present (Constraint #11).
const _disclaimer =
    'This summary was prepared by the user using CycleSignal AI, a symptom-tracking tool. '
    'It is not a clinical diagnosis. It is not medical advice. It is intended solely to '
    'support a conversation with a clinician. CycleSignal AI is not a registered medical device.';

const _docCell = {
  CellCategory.none: PdfColor.fromInt(0xFFF3F4F6),
  CellCategory.bleeding: PdfColor.fromInt(0xFF3B82F6),
  CellCategory.moodLow: PdfColor.fromInt(0xFFFECDD3),
  CellCategory.moodMid: PdfColor.fromInt(0xFFFB7185),
  CellCategory.moodHigh: PdfColor.fromInt(0xFFE11D48),
  CellCategory.physical: PdfColor.fromInt(0xFFF59E0B),
};

Future<Uint8List> buildGpPackPdf({
  required String statement,
  required GPData data,
  required PatternAnalysis? pattern,
  required Map<String, bool> toggles,
  required List<Cycle> cycles,
  required Heatmap heatmap,
}) async {
  final doc = pw.Document();
  final generatedOn = DateFormat('EEE d MMM yyyy').format(DateTime.now());

  pw.Widget heading(String t) => pw.Container(
        margin: const pw.EdgeInsets.only(bottom: 6),
        padding: const pw.EdgeInsets.only(bottom: 4),
        decoration: const pw.BoxDecoration(
          border: pw.Border(bottom: pw.BorderSide(color: PdfColor.fromInt(0xFFE5E7EB))),
        ),
        child: pw.Text(t, style: pw.TextStyle(fontSize: 13, fontWeight: pw.FontWeight.bold)),
      );

  pw.Widget kv(String k, String v) => pw.Padding(
        padding: const pw.EdgeInsets.symmetric(vertical: 2),
        child: pw.Row(mainAxisAlignment: pw.MainAxisAlignment.spaceBetween, children: [
          pw.Text(k, style: const pw.TextStyle(fontSize: 10, color: PdfColor.fromInt(0xFF6B7280))),
          pw.Text(v, style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
        ]),
      );

  pw.Widget heatmapGrid() {
    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: heatmap.rows.asMap().entries.map((row) {
        final c = cycles[row.key];
        return pw.Row(children: [
          pw.SizedBox(
            width: 70,
            child: pw.Text('Cycle ${c.cycleNumber} · ${c.length}d',
                style: const pw.TextStyle(fontSize: 7, color: PdfColor.fromInt(0xFF374151))),
          ),
          ...row.value.map((cell) => pw.Container(
                width: 6,
                height: 6,
                margin: const pw.EdgeInsets.all(0.5),
                decoration: pw.BoxDecoration(
                  color: _docCell[cell.category],
                  borderRadius: pw.BorderRadius.circular(1),
                  border: cell.hasFunctionalImpact
                      ? pw.Border.all(color: PdfColors.black, width: 0.5)
                      : null,
                ),
              )),
        ]);
      }).toList(),
    );
  }

  final sections = <pw.Widget>[];
  void add(pw.Widget w) {
    sections.add(w);
    sections.add(pw.SizedBox(height: 14));
  }

  if (toggles['patientStatement'] == true) {
    add(pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
      heading('Patient statement'),
      pw.Text(statement, style: const pw.TextStyle(fontSize: 10)),
    ]));
  }
  if (toggles['cycleOverview'] == true) {
    add(pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
      heading('Cycle overview'),
      kv('Cycles tracked', '${data.cyclesTracked}'),
      kv('Average cycle length', '${data.avgLength} days'),
      kv('Range (shortest–longest)', data.range),
      kv('Cycles longer than 35 days', '${data.cyclesOver35}'),
      kv('Missed periods', '${data.missedPeriods}'),
    ]));
  }
  if (toggles['symptomTimeline'] == true) {
    add(pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
      heading('Symptom timeline'),
      heatmapGrid(),
    ]));
  }
  if (toggles['symptomSummary'] == true) {
    add(pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
      heading('Symptom summary'),
      pw.Table(
        border: pw.TableBorder.all(color: const PdfColor.fromInt(0xFFE5E7EB), width: 0.5),
        children: [
          pw.TableRow(
            decoration: const pw.BoxDecoration(color: PdfColor.fromInt(0xFFF9FAFB)),
            children: ['Symptom', 'Cycles', 'Window', 'Avg severity']
                .map((h) => pw.Padding(
                    padding: const pw.EdgeInsets.all(4),
                    child: pw.Text(h, style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold))))
                .toList(),
          ),
          ...data.symptomRows.map((r) => pw.TableRow(
                children: [r.name, '${r.cycles}', r.window, r.avgSeverity]
                    .map((v) => pw.Padding(
                        padding: const pw.EdgeInsets.all(4),
                        child: pw.Text(v, style: const pw.TextStyle(fontSize: 9))))
                    .toList(),
              )),
        ],
      ),
    ]));
  }
  if (toggles['functionalImpact'] == true) {
    add(pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
      heading('Functional impact'),
      pw.Text(data.functionalText, style: const pw.TextStyle(fontSize: 10)),
    ]));
  }
  if (toggles['pcosPoints'] == true && data.pcosPoints.isNotEmpty) {
    add(pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
      heading('PCOS-relevant discussion points'),
      ...data.pcosPoints.map((p) => pw.Bullet(text: p, style: const pw.TextStyle(fontSize: 10))),
    ]));
  }
  if (toggles['pmddPoints'] == true && data.pmddPoints.isNotEmpty) {
    add(pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
      heading('PMDD-relevant discussion points'),
      ...data.pmddPoints.map((p) => pw.Bullet(text: p, style: const pw.TextStyle(fontSize: 10))),
    ]));
  }
  if (toggles['redFlags'] == true && data.redFlag) {
    add(pw.Container(
      padding: const pw.EdgeInsets.only(left: 10),
      decoration: const pw.BoxDecoration(
        border: pw.Border(left: pw.BorderSide(color: PdfColor.fromInt(0xFFDC2626), width: 4)),
      ),
      child: pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
        heading('Red flags'),
        pw.Text(
            'The user has reported symptoms that may warrant urgent mental health support. Please see the attached crisis resource list.',
            style: const pw.TextStyle(fontSize: 10)),
      ]),
    ));
  }

  doc.addPage(
    pw.MultiPage(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.all(32),
      build: (context) => [
        pw.Text('CycleSignal AI — GP Evidence Pack',
            style: pw.TextStyle(fontSize: 20, fontWeight: pw.FontWeight.bold)),
        pw.SizedBox(height: 2),
        pw.Text('Generated on $generatedOn · Prepared by the user on their own device',
            style: const pw.TextStyle(fontSize: 9, color: PdfColor.fromInt(0xFF6B7280))),
        pw.SizedBox(height: 14),
        if (pattern != null && pattern.labels.isNotEmpty) ...[
          pw.Container(
            padding: const pw.EdgeInsets.all(8),
            decoration: pw.BoxDecoration(
              color: const PdfColor.fromInt(0xFFF5F3FF),
              border: const pw.Border(left: pw.BorderSide(color: PdfColor.fromInt(0xFF7C3AED), width: 3)),
              borderRadius: pw.BorderRadius.circular(4),
            ),
            child: pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
              pw.Text(pattern.labels.first,
                  style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold)),
              if (pattern.narrative.isNotEmpty) ...[
                pw.SizedBox(height: 3),
                pw.Text(pattern.narrative, style: const pw.TextStyle(fontSize: 10)),
              ],
            ]),
          ),
          pw.SizedBox(height: 14),
        ],
        ...sections,
        pw.Container(
          margin: const pw.EdgeInsets.only(top: 8),
          padding: const pw.EdgeInsets.only(top: 8),
          decoration: const pw.BoxDecoration(
            border: pw.Border(top: pw.BorderSide(color: PdfColor.fromInt(0xFFE5E7EB))),
          ),
          child: pw.Text(_disclaimer,
              style: const pw.TextStyle(fontSize: 8, color: PdfColor.fromInt(0xFF6B7280))),
        ),
      ],
    ),
  );

  return doc.save();
}
