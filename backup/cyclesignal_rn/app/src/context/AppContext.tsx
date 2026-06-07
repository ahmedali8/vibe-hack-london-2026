import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { CycleEntry, GPSectionKey, GPSectionToggles, PatternAnalysis } from '../types';
import {
  DEFAULT_STATEMENT,
  DEFAULT_TOGGLES,
  addEntry as persistAdd,
  deleteAll as persistDeleteAll,
  deleteCycle as persistDeleteCycle,
  deleteEntry as persistDeleteEntry,
  getConsent,
  getStatement,
  getToggles,
  loadEntries,
  saveEntries,
  setConsent,
  setStatement as persistStatement,
  setToggles as persistToggles,
  withdrawConsent as persistWithdraw,
} from '../lib/storage';
import { generateSyntheticEntries } from '../data/syntheticData';
import { analysePatterns } from '../lib/patterns';
import { generateNarrative, generateNarrativeSmart } from '../lib/narrative';
import { buildCycles, buildHeatmap, Cycle } from '../lib/cycle';

type AppState = {
  ready: boolean;
  consented: boolean;
  entries: CycleEntry[];
  cycles: Cycle[];
  heatmap: ReturnType<typeof buildHeatmap>;
  pattern: PatternAnalysis;
  toggles: GPSectionToggles;
  statement: string;
  grantConsent: () => Promise<void>;
  withdrawConsent: () => Promise<void>;
  addCheckIn: (entry: CycleEntry) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  removeCycle: (cycleNumber: number) => Promise<void>;
  deleteAllData: () => Promise<void>;
  setToggle: (key: GPSectionKey, value: boolean) => Promise<void>;
  updateStatement: (s: string) => Promise<void>;
};

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [consented, setConsented] = useState(false);
  const [entries, setEntries] = useState<CycleEntry[]>([]);
  const [toggles, setTogglesState] = useState<GPSectionToggles>(DEFAULT_TOGGLES);
  const [statement, setStatementState] = useState<string>(DEFAULT_STATEMENT);

  useEffect(() => {
    (async () => {
      const consent = await getConsent();
      if (consent) {
        setConsented(true);
        let loaded = await loadEntries();
        if (loaded.length === 0) {
          loaded = generateSyntheticEntries(consent);
          await saveEntries(loaded);
        }
        setEntries(loaded);
        setTogglesState(await getToggles());
        setStatementState(await getStatement());
      }
      setReady(true);
    })();
  }, []);

  const grantConsent = useCallback(async () => {
    const ts = new Date().toISOString();
    await setConsent(ts);
    const seeded = generateSyntheticEntries(ts);
    await saveEntries(seeded);
    setEntries(seeded);
    setTogglesState(DEFAULT_TOGGLES);
    setStatementState(DEFAULT_STATEMENT);
    setConsented(true);
  }, []);

  const withdrawConsent = useCallback(async () => {
    await persistWithdraw();
    setEntries([]);
    setConsented(false);
  }, []);

  const addCheckIn = useCallback(async (entry: CycleEntry) => {
    const next = await persistAdd(entry);
    setEntries(next);
  }, []);

  const removeEntry = useCallback(async (id: string) => {
    setEntries(await persistDeleteEntry(id));
  }, []);

  const removeCycle = useCallback(async (cycleNumber: number) => {
    setEntries(await persistDeleteCycle(cycleNumber));
  }, []);

  const deleteAllData = useCallback(async () => {
    await persistDeleteAll();
    setEntries([]);
    setTogglesState(DEFAULT_TOGGLES);
    setStatementState(DEFAULT_STATEMENT);
  }, []);

  const setToggle = useCallback(
    async (key: GPSectionKey, value: boolean) => {
      const next = { ...toggles, [key]: value };
      setTogglesState(next);
      await persistToggles(next);
    },
    [toggles]
  );

  const updateStatement = useCallback(async (s: string) => {
    setStatementState(s);
    await persistStatement(s);
  }, []);

  const cycles = useMemo(() => buildCycles(entries), [entries]);
  const heatmap = useMemo(() => buildHeatmap(cycles), [cycles]);

  // Deterministic on-device analysis renders immediately (Pattern Agent, always).
  const localPattern = useMemo(() => generateNarrative(analysePatterns(entries)), [entries]);

  // Then, when the backend is reachable, swap in the live Gemini narrative. If the
  // server/key is absent generateNarrativeSmart just returns the local copy, so the
  // dashboard text never regresses and never blocks on the network.
  const [enhanced, setEnhanced] = useState<PatternAnalysis | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (localPattern.flags.cyclesTracked === 0) {
      setEnhanced(null);
      return;
    }
    (async () => {
      const next = await generateNarrativeSmart(localPattern.flags);
      if (!cancelled) setEnhanced(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [localPattern]);

  const pattern = useMemo(() => {
    if (enhanced && JSON.stringify(enhanced.flags) === JSON.stringify(localPattern.flags)) {
      return enhanced;
    }
    return localPattern;
  }, [enhanced, localPattern]);

  const value: AppState = {
    ready,
    consented,
    entries,
    cycles,
    heatmap,
    pattern,
    toggles,
    statement,
    grantConsent,
    withdrawConsent,
    addCheckIn,
    removeEntry,
    removeCycle,
    deleteAllData,
    setToggle,
    updateStatement,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
