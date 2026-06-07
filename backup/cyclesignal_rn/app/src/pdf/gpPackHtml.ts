import { Cell, Cycle } from '../lib/cycle';
import { GPData } from '../lib/gpData';
import { GPSectionToggles, PatternAnalysis } from '../types';

// GP Evidence Pack PDF — PRD Feature 4 / Section 5.7.
// Production stack: @react-pdf/renderer (web). On mobile the client-side equivalent is
// expo-print rendering this HTML to a local PDF — still entirely on-device, nothing sent
// to a server (Constraint #4).

const DISCLAIMER =
  'This summary was prepared by the user using CycleSignal AI, a symptom-tracking tool. It is not a clinical diagnosis. It is not medical advice. It is intended solely to support a conversation with a clinician. CycleSignal AI is not a registered medical device.';

const DOC_CELL: Record<Cell['category'], string> = {
  none: '#F3F4F6',
  bleeding: '#3B82F6',
  moodLow: '#FECDD3',
  moodMid: '#FB7185',
  moodHigh: '#E11D48',
  physical: '#F59E0B',
};

function esc(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
}

function heatmapHtml(cycles: Cycle[], rows: Cell[][], maxDay: number): string {
  if (!cycles.length) return '<p class="muted">No cycle data.</p>';
  const header =
    '<tr><td class="rl"></td>' +
    Array.from({ length: maxDay }, (_, i) =>
      (i + 1) % 5 === 0 || i === 0 ? `<td class="ax">${i + 1}</td>` : '<td class="ax"></td>'
    ).join('') +
    '</tr>';
  const body = rows
    .map((cells, ri) => {
      const c = cycles[ri];
      const cellHtml = cells
        .map((cell) => {
          const bg = DOC_CELL[cell.category];
          const fi = cell.hasFunctionalImpact ? 'border:1px solid #111;' : '';
          return `<td class="cell" style="background:${bg};${fi}"></td>`;
        })
        .join('');
      return `<tr><td class="rl">Cycle ${c.cycleNumber} · ${c.length}d</td>${cellHtml}</tr>`;
    })
    .join('');
  return `<table class="heat">${header}${body}</table>`;
}

function table(rows: string[][], headers: string[]): string {
  const head = `<tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>`;
  const body = rows
    .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
    .join('');
  return `<table class="data">${head}${body}</table>`;
}

export function buildGPPackHtml(args: {
  statement: string;
  data: GPData;
  pattern: PatternAnalysis;
  toggles: GPSectionToggles;
  cycles: Cycle[];
  rows: Cell[][];
  maxDay: number;
  generatedOn: string;
}): string {
  const { statement, data, pattern, toggles, cycles, rows, maxDay, generatedOn } = args;
  const t = toggles;
  const sections: string[] = [];

  if (t.patientStatement)
    sections.push(`<section><h2>Patient statement</h2><p>${esc(statement)}</p></section>`);

  if (t.cycleOverview)
    sections.push(
      `<section><h2>Cycle overview</h2>${table(
        [
          ['Cycles tracked', String(data.overview.cyclesTracked)],
          ['Average cycle length', `${data.overview.avgLength} days`],
          ['Range (shortest–longest)', data.overview.range],
          ['Cycles longer than 35 days', String(data.overview.cyclesOver35)],
          ['Missed periods', String(data.overview.missedPeriods)],
        ],
        ['Measure', 'Value']
      )}</section>`
    );

  if (t.symptomTimeline)
    sections.push(
      `<section><h2>Symptom timeline</h2>${heatmapHtml(cycles, rows, maxDay)}
       <p class="legend">
         <span style="background:#3B82F6"></span>Bleeding
         <span style="background:#E11D48"></span>Mood 4–5
         <span style="background:#FB7185"></span>Mood 3
         <span style="background:#FECDD3"></span>Mood 1–2
         <span style="background:#F59E0B"></span>Physical
       </p></section>`
    );

  if (t.symptomSummary)
    sections.push(
      `<section><h2>Symptom summary</h2>${table(
        data.symptomRows.map((r) => [r.name, String(r.cycles), r.window, r.avgSeverity]),
        ['Symptom', 'Cycles', 'Typical window', 'Avg severity']
      )}</section>`
    );

  if (t.functionalImpact)
    sections.push(`<section><h2>Functional impact</h2><p>${esc(data.functionalText)}</p></section>`);

  if (t.pcosPoints && data.pcosPoints.length)
    sections.push(
      `<section><h2>PCOS-relevant discussion points</h2><ul>${data.pcosPoints
        .map((p) => `<li>${esc(p)}</li>`)
        .join('')}</ul></section>`
    );

  if (t.pmddPoints && data.pmddPoints.length)
    sections.push(
      `<section><h2>PMDD-relevant discussion points</h2><ul>${data.pmddPoints
        .map((p) => `<li>${esc(p)}</li>`)
        .join('')}</ul></section>`
    );

  if (t.redFlags && data.redFlag)
    sections.push(
      `<section class="redflag"><h2>Red flags</h2><p>The user has reported symptoms that may warrant urgent mental health support. Please see the attached crisis resource list.</p></section>`
    );

  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    body { font-family: Helvetica, Arial, sans-serif; color:#111827; padding:32px; font-size:11px; }
    .title { font-size:22px; margin:0 0 2px; }
    .sub { color:#6B7280; margin:0 0 18px; font-size:10px; }
    h2 { font-size:13px; margin:0 0 6px; border-bottom:1px solid #E5E7EB; padding-bottom:4px; }
    section { margin-bottom:16px; }
    p { line-height:1.5; margin:4px 0; }
    table.data { width:100%; border-collapse:collapse; }
    table.data th { text-align:left; background:#F9FAFB; padding:4px 6px; border-bottom:1px solid #E5E7EB; }
    table.data td { padding:4px 6px; border-bottom:0.5px solid #F1F1F4; }
    table.heat { border-collapse:collapse; }
    table.heat td.cell { width:9px; height:9px; padding:0; border-radius:2px; }
    table.heat td.rl { font-size:8px; color:#374151; padding-right:6px; white-space:nowrap; }
    table.heat td.ax { font-size:7px; color:#9CA3AF; text-align:center; height:10px; }
    .legend { font-size:9px; color:#374151; margin-top:8px; }
    .legend span { display:inline-block; width:9px; height:9px; border-radius:2px; margin:0 4px 0 12px; vertical-align:middle; }
    .redflag { border-left:4px solid #DC2626; padding-left:10px; }
    .insight { background:#F5F3FF; border-left:3px solid #7C3AED; padding:8px 10px; border-radius:4px; }
    .muted { color:#6B7280; }
    .disclaimer { font-size:8px; color:#6B7280; border-top:1px solid #E5E7EB; padding-top:8px; margin-top:18px; }
  </style></head>
  <body>
    <h1 class="title">CycleSignal AI — GP Evidence Pack</h1>
    <p class="sub">Generated on ${esc(generatedOn)} · Prepared by the user on their own device</p>
    ${
      pattern.labels.length
        ? `<div class="insight"><strong>${esc(pattern.labels[0])}</strong><br/>${esc(
            pattern.narrative
          )}</div><br/>`
        : ''
    }
    ${sections.join('\n')}
    <div class="disclaimer">${esc(DISCLAIMER)}</div>
  </body></html>`;
}
