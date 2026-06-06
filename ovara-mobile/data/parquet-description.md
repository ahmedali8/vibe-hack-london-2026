# mcPHASES Unified Parquet Data Description

---

## Overview

These two Parquet files are the unified, per-patient view of the mcPHASES dataset, built by joining all 23 source CSVs in `mcphases/` on `id` (and `day_in_study` where applicable). Self-report, hormone, daily, intraday, and session/span signals are reconciled into consistent grains.

| File | Grain | Shape |
|------|-------|-------|
| `patient_day.parquet` | One row per patient-day (`id` + `day_in_study`) | 5,674 rows x 66 cols |
| `patient_summary.parquet` | One row per patient (`id`) | 42 rows x 61 cols |

Both cover 42 patients. There is **no diagnosis/target label** in either file (mcPHASES is not a PCOS-labeled cohort); any target must be a proxy you define.

---

## How They Were Built

1. **Patient spine** — 42 distinct `id` values (range 1-50, non-contiguous), scanned in chunks across all files.
2. **Static** — `subject-info.csv` and `height_and_weight.csv` joined on `id`.
3. **Daily files** — collapsed to one row per `id` + `day_in_study` (mean for numeric, first for categorical) before merging, to avoid row blow-up from intra-day duplicates.
4. **Intraday files** (multi-million rows) — streamed in 2M-row chunks, downcast to `float32`, aggregated to daily mean or sum, then merged.
5. **Session/span files** — `sleep`, `exercise`, `respiratory_rate_summary`, `computed_temperature` aggregated to one row per `id` + day.
6. **Per-patient rollup** — `patient_day` aggregated to per-`id` means plus an observed-day count (`n_days`), then joined to static attributes.

---

## `patient_day.parquet`

One row per `id` + `day_in_study`. Non-null percentages indicate signal coverage across patient-days.

### Keys

| Column | Type | Notes |
|--------|------|-------|
| `id` | int64 | Patient id (100% non-null) |
| `day_in_study` | int64 | Day index within the study (range 1-1004) |

### Hormones and Cycle

| Column | Type | Non-null |
|--------|------|----------|
| `lh` | float64 | 94% |
| `estrogen` | float64 | 94% |
| `pdg` | float64 | 33% (sparse) |
| `phase` | object | 100% (cycle phase) |

### Self-Report (categorical severity / labels)

| Column | Non-null | Column | Non-null |
|--------|----------|--------|----------|
| `flow_volume` | 56% | `flow_color` | 56% |
| `appetite` | 59% | `exerciselevel` | 59% |
| `headaches` | 59% | `cramps` | 59% |
| `sorebreasts` | 59% | `fatigue` | 59% |
| `sleepissue` | 59% | `moodswing` | 59% |
| `stress` | 59% | `foodcravings` | 59% |
| `indigestion` | 59% | `bloating` | 59% |

### Activity and Energy

| Column | Type | Non-null | Notes |
|--------|------|----------|-------|
| `sedentary` | float64 | 65% | Sedentary minutes |
| `lightly` | float64 | 97% | Lightly active minutes |
| `moderately` | float64 | 97% | Moderately active minutes |
| `very` | float64 | 97% | Very active minutes |
| `steps_sum` | float32 | 98% | Daily steps |
| `calories_sum` | float32 | 100% | Daily calories |
| `distance_sum` | float32 | 98% | Daily distance |
| `azm_sum` | float32 | 80% | Active zone minutes |
| `exercise_sessions` | float64 | 31% | Exercise session count |
| `exercise_calories` | float64 | 31% | Exercise calories |

### Heart, Recovery, and Cardio

| Column | Type | Non-null | Notes |
|--------|------|----------|-------|
| `resting_heart_rate` | float64 | 89% | From sleep score table |
| `hr_bpm_mean` | float64 | 96% | Mean intraday heart rate |
| `hrv_rmssd_mean` | float64 | 85% | HRV RMSSD |
| `resp_rate` | float64 | 84% | Respiratory rate |
| `spo2var_mean` | float64 | 96% | Estimated oxygen variation |
| `demographic_vo2_max` | float64 | 97% | Estimated VO2 max |
| `demographic_vo2_max_error` | float64 | 97% | |
| `filtered_demographic_vo2_max` | float64 | 97% | |
| `filtered_demographic_vo2_max_error` | float64 | 97% | |
| `in_default_zone_3` / `_2` / `_1` | float64 | 96% | Time in HR zones |
| `below_default_zone_1` | float64 | 96% | |

### Sleep

| Column | Type | Non-null | Notes |
|--------|------|----------|-------|
| `overall_score` | float64 | 89% | Sleep overall score |
| `composition_score` | float64 | 63% | |
| `revitalization_score` | float64 | 89% | |
| `duration_score` | float64 | 63% | |
| `deep_sleep_in_minutes` | float64 | 89% | |
| `restlessness` | float64 | 89% | |
| `sleep_minutesasleep` | float64 | 90% | Summed across sessions (see Data Quality) |
| `sleep_efficiency` | float64 | 90% | |

### Stress Score

| Column | Type | Non-null |
|--------|------|----------|
| `stress_score` | float64 | 75% |
| `sleep_points` / `max_sleep_points` | float64 | 75% |
| `responsiveness_points` / `max_responsiveness_points` | float64 | 75% |
| `exertion_points` / `max_exertion_points` | float64 | 75% |
| `status` | object | 75% |
| `calculation_failed` | float64 | 75% |

### Metabolic and Temperature

| Column | Type | Non-null | Notes |
|--------|------|----------|-------|
| `glucose_mean` | float64 | 55% | Interval 1 only |
| `wrist_temp_mean` | float64 | 91% | Wrist temperature vs baseline |
| `nightly_temp` | float64 | 80% | Computed nightly temperature |
| `altitude_mean` | float64 | 88% | |

### Resting Heart Rate Table

| Column | Type | Non-null | Notes |
|--------|------|----------|-------|
| `value` | float64 | 100% | Resting heart rate value |
| `error` | float64 | 100% | Associated error |

---

## `patient_summary.parquet`

One row per patient. Combines static attributes with per-patient means of every numeric `patient_day` signal.

### Static Attributes

| Column | Type | Notes |
|--------|------|-------|
| `id` | int64 | Patient id |
| `birth_year` | int64 | |
| `gender` | object | |
| `ethnicity` | object | |
| `education` | object | |
| `sexually_active` | object | |
| `self_report_menstrual_health_literacy` | object | |
| `age_of_first_menarche` | int64 | |
| `height_2022` / `weight_2022` | float64 | Mostly missing |
| `height_2024` / `weight_2024` | float64 | Mostly missing |
| `n_days` | int64 | Observed patient-days (min 38, median 90, max 211) |

### Aggregated Signals

All remaining columns are per-patient means of the `patient_day` signals, suffixed with `_mean` (for example `steps_sum_mean`, `hr_bpm_mean_mean`, `glucose_mean_mean`, `sleep_efficiency_mean`). The double `_mean_mean` arises where the daily column was already a mean (for example `hr_bpm_mean` -> `hr_bpm_mean_mean`).

---

## Data Quality Notes

| # | Caution |
|---|---------|
| 1 | **No target label.** mcPHASES has no PCOS diagnosis; define a proxy (e.g. `phase`, a symptom score, or unsupervised clusters) if supervised learning is needed. |
| 2 | **`sleep_minutesasleep` is summed across sleep sessions per day**, which can exceed 24h-equivalent values. Use mean or the main sleep session instead if you need a per-night figure. |
| 3 | **`glucose_mean` is Interval 1 only** (~55% of patient-days) and contains likely unit/outlier issues (values range from single digits to >100). |
| 4 | **Self-report fields are categorical strings** (e.g. "Not at all", "Moderate", "High"), not numeric; encode before modeling. |
| 5 | **`pdg` and exercise fields are sparse** (33% and 31% of patient-days). |
| 6 | **Uneven follow-up** across patients (`n_days` 38-211); weight analyses for sample size and exposure. |
| 7 | **`height_*` / `weight_*` mostly missing**, so BMI is only computable for a handful of patients. |

---

## Suggested Use

Descriptive EDA, cycle-phase or symptom-cluster analysis, and unsupervised patient profiling. For modeling, build a proxy target from the available columns. This cohort is separate from the `pcos_infertility` dataset and cannot be joined to it on patient.

---

## Data Readiness Rubric

Each dimension is scored 1 (poor) to 5 (excellent) for this unified dataset.

| Dimension | Score | Rationale |
|-----------|:-----:|-----------|
| **Completeness / coverage** | 4/5 | Most wearable and self-report signals exceed 85% non-null per patient-day; sparse exceptions are `pdg` (33%), exercise (31%), and `glucose` (55%). |
| **Label availability** | 1/5 | No diagnosis or outcome label; any target must be a self-defined proxy. |
| **Sample size** | 2/5 | Only 42 patients; sufficient for descriptive work but limited for supervised modeling and generalization. |
| **Temporal depth** | 4/5 | Longitudinal coverage with `n_days` from 38 to 211 per patient enables within-patient trend analysis. |
| **Join integrity** | 5/5 | Clean unification on `id` (+ `day_in_study`); zero duplicate patient-day rows after collapsing. |
| **Consistency / units** | 3/5 | `glucose_mean` shows likely unit/outlier issues; `sleep_minutesasleep` is summed across sessions and can be inflated. |
| **Feature richness** | 5/5 | Broad multimodal signals: hormones, symptoms, sleep, activity, cardio, recovery, metabolic, temperature. |
| **Documentation** | 4/5 | Schema, grains, coverage, and caveats documented here; per-column units/encodings could be expanded. |

**Overall: 3.5/5** — Excellent for exploratory, longitudinal, and unsupervised analysis; constrained for supervised PCOS modeling by the small cohort and absent labels.

### Scoring Guide

| Score | Meaning |
|:-----:|---------|
| 5 | Excellent — no meaningful issues |
| 4 | Good — minor, easily handled issues |
| 3 | Adequate — usable after some cleaning |
| 2 | Limited — notable constraints |
| 1 | Poor — major blocker for this dimension |

---

## PCOS-Likelihood Rubric (Proxy, Non-Diagnostic)

> **Important:** mcPHASES has no PCOS diagnosis. This rubric is a heuristic for ranking *relative* PCOS likelihood from the proxy signals present in the unified tables. It is **not** a clinical diagnosis and does not replace the Rotterdam criteria (oligo/anovulation, hyperandrogenism, polycystic ovaries).

Score each patient (use `patient_summary.parquet`, or `patient_day.parquet` aggregated per `id`). Points are summed to a 0-12 scale.

| Domain | Signal (columns) | 0 pts | 1 pt | 2 pts |
|--------|------------------|-------|------|-------|
| **Cycle irregularity** | `phase` distribution, gaps between `flow_volume` events | Regular cyclic pattern | Mildly irregular | Markedly irregular / prolonged cycles |
| **Hormonal profile** | `lh`, `estrogen`, LH-relative level | Typical LH range | Mildly elevated LH | Persistently elevated LH / high LH-to-estrogen |
| **Luteal / ovulation proxy** | `pdg` (progesterone metabolite) | Clear luteal rise | Weak / inconsistent rise | Absent rise (anovulation proxy) |
| **Metabolic** | `glucose_mean`, BMI from `weight_2024`/`height_2024` | Normal glucose and BMI < 25 | Mildly elevated, BMI 25-30 | Elevated glucose and/or BMI > 30 |
| **Autonomic / recovery** | `resting_heart_rate`, `hrv_rmssd_mean` | RHR low and HRV high | Intermediate | RHR high and HRV low |
| **Symptom burden** | `fatigue`, `moodswing`, `foodcravings`, `bloating`, `cramps` | Mostly "Not at all" | Mixed moderate | Frequent moderate/high |

### Interpreting the Total

| Total (0-12) | Proxy likelihood band | Suggested action |
|:------------:|-----------------------|------------------|
| 0-3 | Low | Background / control profile |
| 4-6 | Moderate | Watchlist; review cycle and metabolic trends |
| 7-9 | Elevated | Strong proxy cluster; candidate for closer review |
| 10-12 | High | Multiple PCOS-adjacent signals co-occur |

### Caveats

- **Proxy only:** glucose units/outliers, summed sleep minutes, and sparse `pdg` (33%) and BMI coverage can bias scores.
- **No ground truth:** bands cannot be validated against labels within mcPHASES; treat as exploratory stratification.
- **Cross-cohort labels:** to calibrate, train on the labeled `pcos_infertility` cohort, but note the feature sets and populations differ and are not directly transferable.
