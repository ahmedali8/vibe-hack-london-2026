"""Offline generator: turn mcPHASES parquet into per-phase insight cards.

React Native can't read parquet at runtime, so we pre-aggregate here and emit
a typed TS module (lib/phaseInsights.ts) that the app bundles and renders.

Run:  python3 scripts/build_phase_insights.py
"""
import json
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DF_PATH = ROOT / "data" / "patient_day.parquet"
OUT_PATH = ROOT / "lib" / "phaseInsights.ts"

# mcPHASES phase label -> app phase key
PHASE_MAP = {
    "Menstrual": "menstrual",
    "Follicular": "follicular",
    "Fertility": "ovulatory",
    "Luteal": "luteal",
}

# Severity categories considered "notable" (moderate or higher)
SEVERITY_ORDER = ["Not at all", "Very Low/Little", "Low", "Moderate", "High", "Very High"]
NOTABLE = {"Moderate", "High", "Very High"}

SYMPTOMS = {
    "cramps": "cramps",
    "fatigue": "fatigue",
    "moodswing": "mood swings",
    "foodcravings": "food cravings",
    "bloating": "bloating",
    "headaches": "headaches",
    "sleepissue": "sleep trouble",
}

# Minimal per-day status line (validated signals only). Short by design.
STATUS = {
    "menstrual": "Cramps likely — keep warm and rest",
    "follicular": "Recovery is strong — a good day to move",
    "ovulatory": "Fertile window — energy and libido peak",
    "luteal": "Lower recovery — favour rest and protein",
}

# Phase-grounded educational line (floor so every phase has useful guidance).
# Each reflects a real signal in the data (e.g. LH/estrogen peak in fertility,
# progesterone/temp rise in luteal).
PHASE_EDU = {
    "menstrual": "Hormones are at their lowest — rest is productive too.",
    "follicular": "Estrogen is climbing — focus and stamina often build now.",
    "ovulatory": "Estrogen and LH peak — your likely fertile window, with energy and libido often highest.",
    "luteal": "Progesterone rises and body temperature ticks up — be extra kind to yourself.",
}

# Curated, gentle suggestion per symptom (wellness tone, non-clinical)
SYMPTOM_TIP = {
    "cramps": "Warmth and iron-rich foods can soften cramps.",
    "fatigue": "Honour the tiredness — lighter days and earlier nights help.",
    "mood swings": "Magnesium-rich foods and a gentle walk can steady mood.",
    "food cravings": "Pair cravings with protein to keep blood sugar steady.",
    "bloating": "Ease salt and sip warm water or peppermint tea.",
    "headaches": "Hydrate well and watch caffeine to limit headaches.",
    "sleep trouble": "Wind down screen-free; a cooler room helps you settle.",
}


def notable_rate(series: pd.Series) -> float:
    s = series[series.isin(SEVERITY_ORDER)]
    if len(s) == 0:
        return 0.0
    return float(s.isin(NOTABLE).mean())


def main() -> None:
    df = pd.read_parquet(DF_PATH)
    df = df[df["phase"].isin(PHASE_MAP.keys())].copy()
    df["pkey"] = df["phase"].map(PHASE_MAP)

    # Baselines across all phases, for lift / deviation comparison.
    base_steps = df["steps_sum"].mean()
    base_rhr = df["resting_heart_rate"].mean()
    base_hrv = df["hrv_rmssd_mean"].mean()
    base_very = df["very"].mean()
    sym_base = {}
    for col, label in SYMPTOMS.items():
        if col in df.columns:
            sym_base[label] = notable_rate(df[col])

    out: dict[str, dict] = {}
    for raw, key in PHASE_MAP.items():
        g = df[df["pkey"] == key]
        n_patients = int(g["id"].nunique())

        # Rank symptoms by LIFT (phase rate - overall baseline) so each phase
        # surfaces what is distinctively elevated, not just globally common.
        rates = []
        for col, label in SYMPTOMS.items():
            if col in g.columns:
                rate = notable_rate(g[col])
                lift = rate - sym_base.get(label, 0.0)
                rates.append((label, rate, lift))
        rates.sort(key=lambda x: x[2], reverse=True)
        top = [(lbl, round(rate * 100)) for lbl, rate, lift in rates[:2] if lift > 0.01]
        if not top:
            rates.sort(key=lambda x: x[1], reverse=True)
            top = [(lbl, round(rate * 100)) for lbl, rate, _ in rates[:1] if rate > 0]

        steps = g["steps_sum"].mean()
        rhr = g["resting_heart_rate"].mean()
        hrv = g["hrv_rmssd_mean"].mean()
        very = g["very"].mean()

        symptoms = [{"label": lbl, "pct": pct} for lbl, pct in top]
        suggestions = [SYMPTOM_TIP[lbl] for lbl, _ in top if lbl in SYMPTOM_TIP]

        # Recovery / intensity note from resting HR + HRV — VALIDATED signals
        # (per-patient Friedman: resting HR W=0.37, HRV W=0.25, both p<1e-5).
        rhr_hi = rhr >= base_rhr + 0.8
        rhr_lo = rhr <= base_rhr - 0.8
        hrv_lo = hrv <= base_hrv - 1.5
        hrv_hi = hrv >= base_hrv + 1.0
        if rhr_hi and hrv_lo:
            suggestions.append(
                f"Your body works a little harder now (resting HR ~{rhr:.0f} bpm, lower HRV) — favour rest and easy movement."
            )
        elif rhr_lo and hrv_hi:
            suggestions.append(
                f"Recovery is strong here (resting HR ~{rhr:.0f} bpm, higher HRV) — a good time to push a little."
            )

        # NOTE: steps / very-active minutes are intentionally NOT used — they do
        # not track the cycle per-patient (Friedman p=0.28 / 0.44, ns).

        # Ensure a useful floor of guidance with the phase-grounded line.
        if len(suggestions) < 2 and key in PHASE_EDU:
            suggestions.append(PHASE_EDU[key])

        headline = (
            f"{top[0][1]}% logged moderate-or-higher {top[0][0]} in this phase."
            if top
            else "A steadier phase — symptoms tend to settle here."
        )

        out[key] = {
            "status": STATUS[key],
            "headline": headline,
            "symptoms": symptoms,
            "suggestions": suggestions[:3],
            "stats": [
                {"label": "Resting HR", "value": f"{rhr:.0f} bpm"},
                {"label": "HRV", "value": f"{hrv:.0f} ms"},
            ],
            "sampleDays": int(len(g)),
            "samplePatients": n_patients,
        }

    body = json.dumps(out, indent=2, ensure_ascii=False)
    ts = (
        "// AUTO-GENERATED by scripts/build_phase_insights.py from the mcPHASES dataset.\n"
        "// Do not edit by hand. Re-run the script to refresh.\n"
        "// Source: PhysioNet mcPHASES v1.0.0 (42 participants, self-report + wearables).\n\n"
        "import type { CyclePhase } from './storage';\n\n"
        "export type PhaseInsight = {\n"
        "  status: string;\n"
        "  headline: string;\n"
        "  symptoms: { label: string; pct: number }[];\n"
        "  suggestions: string[];\n"
        "  stats: { label: string; value: string }[];\n"
        "  sampleDays: number;\n"
        "  samplePatients: number;\n"
        "};\n\n"
        f"export const PHASE_INSIGHTS: Record<CyclePhase, PhaseInsight> = {body} as const;\n"
    )
    OUT_PATH.write_text(ts, encoding="utf-8")
    print(f"Wrote {OUT_PATH.relative_to(ROOT)}")
    print(body)


if __name__ == "__main__":
    main()
