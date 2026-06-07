# PCOS/PMOS Health Scoring Rubric

**Scale:** 0 = worst for PCOS health, 100 = healthiest. All sub-scores are 0–100 and
combine into a weighted total. Direction is always "healthier → higher".

**Architecture:** *Anchor + reference layers.* The patient score is computed **only** from the
541-subject clinical cohort (`pcos_scored.csv`). Food (`food_scored.csv`) is a separate,
independently-scored reference table used to *generate* diet plans — it is **not** row-joined
to patients (no shared subject key exists across the source datasets).

---

## 1. Anchor patient score (`pcos_scored.csv`)

Source: Kaggle PCOS cohort, sheet `Full_new` (541 patients × 44 fields), with the binary
label `PCOS (Y/N)`. Total score = weighted mean of six sub-scores:

| Sub-score | Weight | Basis |
|---|---:|---|
| Hyperandrogenism | 0.20 | Rotterdam pillar 1 |
| Cycle / ovulatory | 0.20 | Rotterdam pillar 2 (oligo-anovulation) |
| Imaging / PCOM | 0.20 | Rotterdam pillar 3 (polycystic morphology) |
| Metabolic | 0.20 | dominant comorbidity burden (T2D HR 1.47, CVD HR 1.76) |
| Hormonal | 0.12 | supports diagnosis; overlaps imaging via AMH |
| Lifestyle | 0.08 | modifiable; drives plan generation |

Weights sum to 1.00. The three Rotterdam diagnostic pillars carry 0.60 combined.

### Per-feature scoring (each → 0–100, 100 = healthiest)

**Metabolic** = mean(BMI, Waist:Hip, RBS, BP, weight-gain)
- **BMI:** 18.5–24.9 → 100 · 25–29.9 → 80 · 30–34.9 → 50 · 35–39.9 → 25 · ≥40 → 0 · 17–18.49 → 70 · <17 → 50
- **Waist:Hip (female):** <0.80 → 100 · 0.80–0.84 → 75 · 0.85–0.89 → 50 · 0.90–0.94 → 25 · ≥0.95 → 0  *(WHO abdominal-obesity cutoff 0.85)*
- **RBS (random glucose):** <140 → 100 · 140–199 → 50 · ≥200 → 0  *(ADA impaired/diabetic bands)*
- **BP:** <120/<80 → 100 · 120–129/<80 → 80 · 130–139 or 80–89 → 55 · 140–159 or 90–99 → 30 · ≥160 or ≥100 → 0  *(ACC/AHA stages; worst of systolic/diastolic)*
- **Weight gain (Y/N):** No → 100 · Yes → 0

**Hyperandrogenism** = 100 − (40·hirsutism + 25·acanthosis + 20·acne + 15·alopecia), clamped 0–100
- hair growth = hirsutism (heaviest — Rotterdam hyperandrogenism marker); skin darkening = acanthosis nigricans; pimples = acne; hair loss = androgenic alopecia.

**Cycle / ovulatory** = 0.8·regularity + 0.2·flow-length
- **Cycle(R/I):** 2 = Regular → 100 · 4 or 5 = Irregular → 0  *(oligo/anovulation; coding verified against label)*
- **Flow length (days):** 3–7 → 100, linearly down to 0 at ≤1 or ≥12.

**Imaging / PCOM** = follicle-count score on the **worst (max-count) ovary**
- per-ovary follicle count: <8 → 100 · 8–11 → 100→70 · 12–19 → 70→30 · 20–24 → 30→10 · ≥25 → 0  *(≥12 = legacy PCOM cutoff; ≥20 = 2023 international guideline)*

**Hormonal** = mean(AMH, LH:FSH, TSH, PRL, Vit D3)
- **AMH (ng/mL), age-specific cutoff** (Ramezani Tehrani): age 20–27 → 5.7 · 27–35 → 4.55 · 35–40 → 3.72 · else → 4.0. Score: ≤0.5·cutoff → 100 · =cutoff → 50 · ≥2·cutoff → 0 (linear). Higher AMH = worse.
- **LH:FSH ratio** (computed from raw LH, FSH): ≤1 → 100 · 1–2 → 100→50 · 2–3 → 50→20 · ≥3 → 0  *(elevated LH:FSH classic in PCOS)*
- **TSH (mIU/L):** 0.4–4.0 → 100 · 0.1–0.4 or 4–10 → 50 · ≤0.1 or ≥10 → 0
- **PRL (ng/mL):** <25 → 100 · 25–50 → 60 · 50–100 → 30 · ≥100 → 0
- **Vit D3 (ng/mL):** ≥30 → 100 · 20–29.9 → 70 · 12–19.9 → 40 · <12 → 10  *(Endocrine Society sufficiency bands; deficiency common in PCOS)*

**Lifestyle** = mean(fast-food, exercise)
- **Fast food (Y/N):** No → 100 · Yes → 30
- **Reg. exercise (Y/N):** Yes → 100 · No → 40

### Level bands (applied to total and each sub-score)
0–20 Very Poor · 20–40 Poor · 40–60 Moderate · 60–80 Good · 80–100 Excellent

### Cleaning rules applied
- xlsx loaded `data_only=True` so the `FSH/LH` and `Waist:Hip Ratio` Excel `=DIVIDE()` formulas resolve to values.
- Header whitespace/typos trimmed; binary Y/N → 1/0 per codebook.
- 4 dirty cells repaired: AMH `'a'` → median-imputed; II-βHCG `'1.99.'` → 1.99; 1 missing marriage-years → median; 1 missing fast-food → mode.
- Remaining numeric blanks → column median (clinical) / mode (binary).

---

## 2. Food reference score (`food_scored.csv`)

Source: USDA FoodData Central whole-food releases — Foundation (2026-04-30), SR-Legacy (2018-04),
Survey/FNDDS (2024-10-31). Branded foods excluded. Amounts are per 100 g.

`pcos_diet_score` (transparent additive model, base 50, clamped 0–100):

| Component | Effect |
|---|---|
| Fiber (g) | + min(2·fiber, 20) |
| Protein (g) | + min(0.5·protein, 15) |
| Unsaturated fat MUFA+PUFA (g) | + min(0.4·unsat, 10) |
| Total sugar (g) | − min(0.6·sugar, 25) |
| Added sugar (g, if present) | − min(1.0·added, 20) |
| Saturated fat (g) | − min(1.0·satfat, 15) |
| Trans fat (g) | − min(5·trans, 10) |
| Sodium (mg) | − min(sodium/100, 15) |
| Net carbs = carb − fiber (g) | − min(0.2·netcarb, 15) |

Rationale: PCOS dietary guidance favors high fiber, adequate lean protein, unsaturated fats,
and low glycemic load; penalizes added/total sugar, saturated/trans fat, sodium, and high net
carbohydrate. Same level bands as above.

**Caveat:** nutrient coverage varies by food; missing nutrients contribute 0 to their term.
This is a heuristic quality index, not a validated clinical diet score.

---

## Intended use & limits
Research / app-prototype only. **Not** a diagnostic instrument. The patient score reflects this
particular 541-subject cohort and its measured fields; thresholds are population/assay-sensitive
(esp. AMH). Validation (PCOS+ vs PCOS− separation, AUC) is reported in `validation_report.md`.
