import AsyncStorage from '@react-native-async-storage/async-storage';
import { CycleEntry, GPSectionToggles } from '../types';

// Local Storage — PRD Section 5.6. The production stack uses Dexie.js + IndexedDB (web).
// On mobile the equivalent privacy-first local store is AsyncStorage: no server, no
// account, no transmission. This is the product's primary privacy guarantee (Constraint #4).

const KEYS = {
  entries: 'cyclesignal:entries',
  consent: 'cyclesignal:consent', // ISO datetime of consent, or absent
  toggles: 'cyclesignal:gpToggles',
  statement: 'cyclesignal:patientStatement',
};

export const DEFAULT_TOGGLES: GPSectionToggles = {
  patientStatement: true,
  cycleOverview: true,
  symptomTimeline: true,
  symptomSummary: true,
  functionalImpact: true,
  pcosPoints: true,
  pmddPoints: true,
  redFlags: true,
};

export const DEFAULT_STATEMENT =
  'I want to understand whether PCOS or PMDD should be assessed.';

export async function loadEntries(): Promise<CycleEntry[]> {
  const raw = await AsyncStorage.getItem(KEYS.entries);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CycleEntry[];
  } catch {
    return [];
  }
}

export async function saveEntries(entries: CycleEntry[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.entries, JSON.stringify(entries));
}

export async function addEntry(entry: CycleEntry): Promise<CycleEntry[]> {
  const entries = await loadEntries();
  const next = [...entries, entry].sort((a, b) => a.date.localeCompare(b.date));
  await saveEntries(next);
  return next;
}

export async function deleteEntry(id: string): Promise<CycleEntry[]> {
  const next = (await loadEntries()).filter((e) => e.id !== id);
  await saveEntries(next);
  return next;
}

export async function deleteCycle(cycleNumber: number): Promise<CycleEntry[]> {
  const next = (await loadEntries()).filter((e) => e.cycleNumber !== cycleNumber);
  await saveEntries(next);
  return next;
}

// PRD Feature 6 — "Delete all data" destroys the entire local store.
export async function deleteAll(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.entries, KEYS.toggles, KEYS.statement]);
}

export async function getConsent(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.consent);
}
export async function setConsent(ts: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.consent, ts);
}
// Withdraw consent — PRD Feature 6: full deletion + reset to consent screen.
export async function withdrawConsent(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.entries, KEYS.toggles, KEYS.statement, KEYS.consent]);
}

export async function getToggles(): Promise<GPSectionToggles> {
  const raw = await AsyncStorage.getItem(KEYS.toggles);
  if (!raw) return DEFAULT_TOGGLES;
  try {
    return { ...DEFAULT_TOGGLES, ...(JSON.parse(raw) as Partial<GPSectionToggles>) };
  } catch {
    return DEFAULT_TOGGLES;
  }
}
export async function setToggles(t: GPSectionToggles): Promise<void> {
  await AsyncStorage.setItem(KEYS.toggles, JSON.stringify(t));
}

export async function getStatement(): Promise<string> {
  return (await AsyncStorage.getItem(KEYS.statement)) ?? DEFAULT_STATEMENT;
}
export async function setStatement(s: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.statement, s);
}
