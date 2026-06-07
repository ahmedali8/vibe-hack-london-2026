# Data Dictionary — `data/combined/`

Combined PCOS/PMOS health-scoring package. Scale 0–100, **100 = healthiest**.
See `scoring_rubric.md` for every threshold/weight and `validation_report.md` for separation metrics.

## `pcos_scored.csv` — anchor (541 real patients, 33 cols)
Source: Kaggle PCOS cohort (`archive/PCOS_data_without_infertility.xlsx`, sheet `Full_new`), cleaned.

| Column | Type | Notes |
|---|---|---|
| `Sl_No` | int | cohort row id (1–541) |
| `PCOS_label` | 0/1 | ground-truth diagnosis (1 = PCOS); **not** an input to the score |
| `Age` | yrs | |
| `BMI` | kg/m² | |
| `Waist_Hip_Ratio` | ratio | recomputed from Excel formula |
| `RBS_mg_dl` | mg/dL | random blood glucose |
| `BP_Systolic`, `BP_Diastolic` | mmHg | |
| `Weight_gain`,`Hair_growth`,`Skin_darkening`,`Hair_loss`,`Pimples` | 0/1 | symptom flags |
| `Cycle_RI` | 2/4 | 2 = regular, 4 = irregular (5 = stray→treated irregular) |
| `Cycle_length_days` | days | menstrual flow length |
| `Follicle_L`, `Follicle_R` | count | antral follicles per ovary (ultrasound) |
| `AMH` | ng/mL | anti-Müllerian hormone |
| `LH`, `FSH` | mIU/mL | LH:FSH ratio derived in scoring |
| `TSH` | mIU/L | |
| `PRL` | ng/mL | prolactin |
| `VitD3` | ng/mL | |
| `Fast_food`, `Reg_exercise` | 0/1 | lifestyle flags |
| `metabolic_score` | 0–100 | sub-score (weight 0.20) |
| `hyperandrogenism_score` | 0–100 | sub-score (weight 0.20) |
| `cycle_score` | 0–100 | sub-score (weight 0.20) |
| `imaging_score` | 0–100 | sub-score (weight 0.20) |
| `hormonal_score` | 0–100 | sub-score (weight 0.12) |
| `lifestyle_score` | 0–100 | sub-score (weight 0.08) |
| `pcos_health_score` | 0–100 | weighted total |
| `health_level` | band | Very Poor / Poor / Moderate / Good / Excellent |

## `food_scored.csv` — diet reference (13,694 whole foods, 17 cols)
Source: USDA FoodData Central whole-food releases (Foundation, SR-Legacy, Survey/FNDDS).
Consumable food types only; nutrients per 100 g. **Not** joined to patients — used to generate diet plans.

| Column | Type | Notes |
|---|---|---|
| `fdc_id` | int | USDA FoodData Central id |
| `description` | str | food name |
| `release` | str | foundation / sr_legacy / survey |
| `food_category` | str | USDA category (where available) |
| `energy_kcal`,`protein_g`,`fat_g`,`carb_g`,`fiber_g`,`sugar_g`,`satfat_g`,`trans_g`,`sodium_mg`,`mufa_g`,`pufa_g` | per 100 g | nutrients used in scoring (missing → 0 in that term) |
| `pcos_diet_score` | 0–100 | PCOS diet-quality (high fiber/protein/unsat ↑; sugar/satfat/trans/sodium/net-carb ↓) |
| `level` | band | same 5 bands |

## Reproduce
```
python3 build/build_anchor.py    # -> pcos_scored.csv + _anchor_validation.json
python3 build/build_food.py      # -> food_scored.csv  + _food_validation.json
```

## Scope notes
Excluded as non-joinable / out-of-scope for this build: USDA branded foods (2M, packaged);
activity datasets (mm-fit, PAMAP2, MHEALTH, UCI-HAR, CPET — anonymous sensor timeseries);
CGM/diabetes (HUPA-UCM, CGMacros — different population, CGMacros has no data files);
gut dictionaries (no underlying data); ovarian/endometriosis imaging (MMOTU, Glenda, no_pathology —
no PCOS labels); TCGA-OV (ovarian cancer). None share a subject key with the PCOS cohort.
