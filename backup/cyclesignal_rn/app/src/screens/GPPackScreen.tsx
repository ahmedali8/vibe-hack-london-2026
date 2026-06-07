import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Download, Lock } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { fonts, type } from '../theme/typography';
import { useApp } from '../context/AppContext';
import { TopBar } from '../components/TopBar';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/Button';
import { Toggle } from '../components/Toggle';
import { computeGPData } from '../lib/gpData';
import { buildGPPackHtml } from '../pdf/gpPackHtml';
import { GPSectionKey } from '../types';
import { prettyDate } from '../lib/cycle';

const SECTION_LABELS: { key: GPSectionKey; label: string }[] = [
  { key: 'patientStatement', label: 'Patient statement' },
  { key: 'cycleOverview', label: 'Cycle overview' },
  { key: 'symptomTimeline', label: 'Symptom timeline (heatmap)' },
  { key: 'symptomSummary', label: 'Symptom summary table' },
  { key: 'functionalImpact', label: 'Functional impact' },
  { key: 'pcosPoints', label: 'PCOS discussion points' },
  { key: 'pmddPoints', label: 'PMDD discussion points' },
  { key: 'redFlags', label: 'Red flags (if triggered)' },
];

export function GPPackScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { entries, cycles, heatmap, pattern, toggles, setToggle, statement, updateStatement } =
    useApp();
  const [draft, setDraft] = useState(statement);
  const [exporting, setExporting] = useState(false);

  const data = useMemo(
    () => computeGPData(entries, cycles, pattern.flags),
    [entries, cycles, pattern.flags]
  );

  const onExport = async () => {
    try {
      setExporting(true);
      await updateStatement(draft);
      const html = buildGPPackHtml({
        statement: draft,
        data,
        pattern,
        toggles,
        cycles,
        rows: heatmap.rows,
        maxDay: heatmap.maxDay,
        generatedOn: prettyDate(new Date().toISOString().slice(0, 10)),
      });
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      } else {
        Alert.alert('GP Pack created', `Saved on this device:\n${uri}`);
      }
    } catch (e: any) {
      Alert.alert('Export failed', e?.message ?? 'Could not generate the PDF.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={{ paddingTop: insets.top }}>
        <TopBar
          onPressLock={() => navigation.navigate('Privacy')}
          onPressSettings={() => navigation.navigate('Privacy')}
        />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 16 }}>
        <View>
          <Text style={styles.h1}>GP Evidence Pack</Text>
          <Text style={styles.sub}>A one-page summary you control, for your clinician.</Text>
        </View>

        {/* Patient statement editor */}
        <Card>
          <Text style={styles.cardLabel}>Patient statement</Text>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            multiline
            style={styles.statementInput}
            placeholder="What you want to understand…"
            placeholderTextColor={colors.textMuted}
          />
        </Card>

        {/* Section toggles */}
        <Card>
          <Text style={styles.cardLabel}>Include in pack</Text>
          {SECTION_LABELS.map((s) => (
            <View key={s.key} style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{s.label}</Text>
              <Toggle value={toggles[s.key]} onChange={(v) => setToggle(s.key, v)} />
            </View>
          ))}
          <View style={styles.toggleRow}>
            <View style={styles.lockedLabel}>
              <Lock size={14} color={colors.textMuted} strokeWidth={1.5} />
              <Text style={[styles.toggleLabel, { color: colors.textMuted }]}>
                Disclaimer (always included)
              </Text>
            </View>
            <Toggle value disabled onChange={() => {}} />
          </View>
        </Card>

        {/* White document preview — PRD 0.9 */}
        <Text style={styles.cardLabel}>Preview</Text>
        <View style={styles.doc}>
          <Text style={styles.docTitle}>CycleSignal AI — GP Evidence Pack</Text>
          <Text style={styles.docSub}>
            Generated on {prettyDate(new Date().toISOString().slice(0, 10))}
          </Text>

          {pattern.labels.length > 0 && (
            <View style={styles.docInsight}>
              <Text style={styles.docInsightTitle}>{pattern.labels[0]}</Text>
              <Text style={styles.docInsightBody}>{pattern.narrative}</Text>
            </View>
          )}

          {toggles.patientStatement && (
            <DocSection title="Patient statement">
              <Text style={styles.docBody}>{draft}</Text>
            </DocSection>
          )}
          {toggles.cycleOverview && (
            <DocSection title="Cycle overview">
              <DocRow k="Cycles tracked" v={String(data.overview.cyclesTracked)} />
              <DocRow k="Average cycle length" v={`${data.overview.avgLength} days`} />
              <DocRow k="Range" v={data.overview.range} />
              <DocRow k="Cycles > 35 days" v={String(data.overview.cyclesOver35)} />
            </DocSection>
          )}
          {toggles.symptomTimeline && (
            <DocSection title="Symptom timeline">
              <Text style={styles.docMuted}>
                Colour heatmap of all cycles is embedded in the exported PDF.
              </Text>
            </DocSection>
          )}
          {toggles.symptomSummary && (
            <DocSection title="Symptom summary">
              {data.symptomRows.map((r) => (
                <DocRow key={r.name} k={r.name} v={`${r.cycles} cycles · ${r.window}`} />
              ))}
            </DocSection>
          )}
          {toggles.functionalImpact && (
            <DocSection title="Functional impact">
              <Text style={styles.docBody}>{data.functionalText}</Text>
            </DocSection>
          )}
          {toggles.pcosPoints && data.pcosPoints.length > 0 && (
            <DocSection title="PCOS-relevant discussion points">
              {data.pcosPoints.map((p) => (
                <Text key={p} style={styles.docBullet}>
                  • {p}
                </Text>
              ))}
            </DocSection>
          )}
          {toggles.pmddPoints && data.pmddPoints.length > 0 && (
            <DocSection title="PMDD-relevant discussion points">
              {data.pmddPoints.map((p) => (
                <Text key={p} style={styles.docBullet}>
                  • {p}
                </Text>
              ))}
            </DocSection>
          )}
          {toggles.redFlags && data.redFlag && (
            <View style={styles.docRedflag}>
              <Text style={styles.docSectionTitle}>Red flags</Text>
              <Text style={styles.docBody}>
                The user has reported symptoms that may warrant urgent mental health support.
              </Text>
            </View>
          )}

          <Text style={styles.docDisclaimer}>
            This summary was prepared by the user using CycleSignal AI, a symptom-tracking tool. It
            is not a clinical diagnosis. It is not medical advice. It is intended solely to support a
            conversation with a clinician. CycleSignal AI is not a registered medical device.
          </Text>
        </View>

        <PrimaryButton
          label={exporting ? 'Generating…' : 'Download GP Pack'}
          icon={<Download size={18} color={colors.textPrimary} strokeWidth={1.5} />}
          onPress={onExport}
          disabled={exporting}
        />
        <Text style={styles.exportNote}>
          Generated on your device. Nothing is sent to a server.
        </Text>
      </ScrollView>
    </View>
  );
}

function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.docSection}>
      <Text style={styles.docSectionTitle}>{title}</Text>
      {children}
    </View>
  );
}
function DocRow({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.docRow}>
      <Text style={styles.docRowK}>{k}</Text>
      <Text style={styles.docRowV}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgBase },
  h1: { ...type.display, color: colors.textPrimary },
  sub: { ...type.label, color: colors.textSecondary, marginTop: 2 },
  cardLabel: { ...type.label, color: colors.textSecondary, marginBottom: 10, letterSpacing: 0.3 },
  statementInput: {
    backgroundColor: colors.bgElevated,
    borderRadius: 10,
    padding: 12,
    color: colors.textPrimary,
    fontFamily: fonts.sans400,
    fontSize: 15,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
  },
  toggleLabel: { ...type.body, color: colors.textPrimary },
  lockedLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  // White document preview
  doc: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 22,
  },
  docTitle: { fontFamily: fonts.sans600, fontSize: 16, color: '#111827' },
  docSub: { fontFamily: fonts.sans400, fontSize: 10, color: colors.pdfMuted, marginBottom: 14 },
  docInsight: {
    backgroundColor: '#F5F3FF',
    borderLeftWidth: 3,
    borderLeftColor: colors.accentViolet,
    borderRadius: 4,
    padding: 10,
    marginBottom: 12,
  },
  docInsightTitle: { fontFamily: fonts.sans600, fontSize: 12, color: '#111827' },
  docInsightBody: { fontFamily: fonts.sans400, fontSize: 11, color: '#374151', marginTop: 3, lineHeight: 16 },
  docSection: { marginBottom: 12 },
  docSectionTitle: {
    fontFamily: fonts.sans600,
    fontSize: 12,
    color: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: colors.pdfBorder,
    paddingBottom: 3,
    marginBottom: 5,
  },
  docBody: { fontFamily: fonts.sans400, fontSize: 11, color: '#374151', lineHeight: 16 },
  docMuted: { fontFamily: fonts.sans400, fontSize: 11, color: colors.pdfMuted, fontStyle: 'italic' },
  docBullet: { fontFamily: fonts.sans400, fontSize: 11, color: '#374151', lineHeight: 17 },
  docRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  docRowK: { fontFamily: fonts.sans400, fontSize: 11, color: '#6B7280' },
  docRowV: { fontFamily: fonts.sans500, fontSize: 11, color: '#111827' },
  docRedflag: {
    borderLeftWidth: 4,
    borderLeftColor: colors.safetyRed,
    paddingLeft: 10,
    marginBottom: 12,
  },
  docDisclaimer: {
    fontFamily: fonts.sans400,
    fontSize: 8,
    color: colors.pdfMuted,
    borderTopWidth: 1,
    borderTopColor: colors.pdfBorder,
    paddingTop: 8,
    marginTop: 8,
    lineHeight: 12,
  },
  exportNote: { ...type.caption, color: colors.textMuted, textAlign: 'center' },
});
