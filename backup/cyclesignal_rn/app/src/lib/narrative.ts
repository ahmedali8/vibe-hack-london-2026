import { PatternFlags, PatternAnalysis } from '../types';
import { patternLabels } from './patterns';
import { remoteNarrative } from './api';

// Signal Agent — PRD Section 6.3 / 5.3.
// In the production stack this is Gemini 3.1 Flash. Here it runs on-device so the demo
// works with no API keys, no server, and no data leaving the phone (privacy-first).
// The warm, non-diagnostic prose mirrors the PRD's example output.

// Hard post-processing filter — Constraint #1. Narrative must never imply a diagnosis.
const DIAGNOSTIC_PHRASES = [
  /\byou have\b/i,
  /\byou are suffering from\b/i,
  /\bdiagnos/i,
  /\byou(?:'| a)re (?:pcos|pmdd)\b/i,
  /\bcaused by\b/i,
];

export function isNonDiagnostic(text: string): boolean {
  return !DIAGNOSTIC_PHRASES.some((p) => p.test(text));
}

const CLOSING = 'This pattern may be worth discussing with a clinician.';

function compose(flags: PatternFlags): string {
  if (flags.cyclesTracked === 0) {
    return 'Check in a few more times to see your pattern emerge.';
  }
  const parts: string[] = [];

  if (flags.premenstrualMoodClustering) {
    parts.push(
      `Your mood symptoms have appeared in ${flags.premenstrualWindowLabel} in ${flags.premenstrualMoodCycles} of your last ${flags.cyclesTracked} cycles.`
    );
  }
  if (flags.irregularCycles) {
    parts.push(`Your cycle lengths have ranged from ${flags.cycleLengthRange}.`);
  }
  if (flags.repeatedFunctionalImpact) {
    parts.push(
      `You have reported missing work or cancelling plans in ${flags.functionalImpactCycles} of the last ${flags.cyclesTracked} cycles.`
    );
  }
  if (parts.length === 0) {
    parts.push(
      `Across ${flags.cyclesTracked} tracked cycles your symptoms haven't yet formed a clear repeating pattern.`
    );
    return parts.join(' ');
  }
  return `${parts.join(' ')} ${CLOSING}`;
}

// Stricter fallback (mirrors the GPT-5.4 Mini fallback in PRD 5.3) — plainer, guaranteed safe.
function fallback(flags: PatternFlags): string {
  return `Across ${flags.cyclesTracked} cycles, some symptoms have repeated around the same point in your cycle. ${CLOSING}`;
}

export function generateNarrative(flags: PatternFlags): PatternAnalysis {
  let narrative = compose(flags);
  let model: PatternAnalysis['narrativeModel'] = 'on-device';
  if (!isNonDiagnostic(narrative)) {
    narrative = fallback(flags);
    model = 'gpt-5.4-mini-fallback';
  }
  return {
    flags,
    labels: patternLabels(flags),
    narrative,
    narrativeModel: model,
    updatedAt: new Date().toISOString(),
  };
}

// Production path: ask the backend (Gemini 3.1 Flash / gemini-2.5-flash) for the
// warm narrative; the server already enforces the non-diagnostic filter, and we
// re-check here as defence in depth. Falls back to the deterministic on-device
// narrative whenever the server/key is absent or the prose fails the filter.
export async function generateNarrativeSmart(flags: PatternFlags): Promise<PatternAnalysis> {
  const local = generateNarrative(flags);
  if (flags.cyclesTracked === 0) return local;
  const remote = await remoteNarrative(flags);
  if (remote && isNonDiagnostic(remote.narrative)) {
    return {
      ...local,
      narrative: remote.narrative,
      narrativeModel: 'gemini-3.1-flash',
      updatedAt: new Date().toISOString(),
    };
  }
  return local;
}
