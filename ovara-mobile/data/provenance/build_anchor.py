#!/usr/bin/env python3
"""Clean + score the 541-subject PCOS cohort -> data/combined/pcos_scored.csv
Implements scoring_rubric.md exactly. 100 = healthiest."""
import os, openpyxl, numpy as np, pandas as pd, json, statistics
from pathlib import Path

# Raw upstream datasets are NOT shipped in this repo. Point OVARA_RAW_DATA at the
# folder containing data/archive/... (the committed data/*.csv are the outputs).
ROOT = Path(os.environ.get("OVARA_RAW_DATA", "/Users/ahmedali/scorpio/vibe-hack"))
XLSX = ROOT / "data/archive/PCOS_data_without_infertility.xlsx"
OUT  = ROOT / "data/combined/pcos_scored.csv"

if not XLSX.exists():
    raise SystemExit(
        f"Raw PCOS dataset not found at {XLSX}.\n"
        "This provenance script regenerates the source CSV from raw upstream data "
        "not shipped here. Set OVARA_RAW_DATA to the folder containing "
        "data/archive/PCOS_data_without_infertility.xlsx. See README 'Development'."
    )

# ---------- load (data_only resolves =DIVIDE formula cells) ----------
wb = openpyxl.load_workbook(XLSX, data_only=True)
rows = list(wb["Full_new"].iter_rows(values_only=True))
hdr = [(_h or "").strip() for _h in rows[0]]
data = [r for r in rows[1:] if any(c is not None for c in r)]
df = pd.DataFrame(data, columns=[*hdr[:-1], "_blank"]).drop(columns=["_blank"])

def num(col):
    """coerce a column to float, stripping stray text like '1.99.' / 'a'."""
    def f(v):
        if v is None: return np.nan
        if isinstance(v, str):
            v = v.strip().rstrip(".")
            try: return float(v)
            except: return np.nan
        return float(v)
    return df[col].map(f)

# numeric/clinical columns -> median impute ; binary -> mode impute
C = {
 "sl": "Sl. No", "label": "PCOS (Y/N)", "age": "Age (yrs)", "bmi": "BMI",
 "wh": "Waist:Hip Ratio", "rbs": "RBS(mg/dl)", "sbp": "BP _Systolic (mmHg)",
 "dbp": "BP _Diastolic (mmHg)", "wtgain": "Weight gain(Y/N)",
 "hair": "hair growth(Y/N)", "skin": "Skin darkening (Y/N)",
 "hloss": "Hair loss(Y/N)", "acne": "Pimples(Y/N)",
 "cyc": "Cycle(R/I)", "cyclen": "Cycle length(days)",
 "folL": "Follicle No. (L)", "folR": "Follicle No. (R)",
 "amh": "AMH(ng/mL)", "lh": "LH(mIU/mL)", "fsh": "FSH(mIU/mL)",
 "tsh": "TSH (mIU/L)", "prl": "PRL(ng/mL)", "vitd": "Vit D3 (ng/mL)",
 "fast": "Fast food (Y/N)", "exer": "Reg.Exercise(Y/N)",
}
V = {k: num(v) for k, v in C.items()}
binary = {"label","wtgain","hair","skin","hloss","acne","fast","exer"}
for k, s in V.items():
    if k in binary:
        V[k] = s.fillna(s.mode(dropna=True).iloc[0])
    else:
        V[k] = s.fillna(s.median())

# ---------- piecewise helpers ----------
def lin(x, x0, x1, y0, y1):
    if x1 == x0: return y0
    t = (x - x0) / (x1 - x0)
    return y0 + (y1 - y0) * min(max(t, 0.0), 1.0)
def clamp(x): return float(min(100.0, max(0.0, x)))

def bmi_s(b):
    if b < 17: return 50
    if b < 18.5: return 70
    if b < 25: return 100
    if b < 30: return 80
    if b < 35: return 50
    if b < 40: return 25
    return 0
def wh_s(w):
    if w < 0.80: return 100
    if w < 0.85: return 75
    if w < 0.90: return 50
    if w < 0.95: return 25
    return 0
def rbs_s(r):  return 100 if r < 140 else (50 if r < 200 else 0)
def bp_s(s, d):
    if s < 120 and d < 80: return 100
    if s < 130 and d < 80: return 80
    if s < 140 or d < 90:  return 55
    if s < 160 or d < 100: return 30
    return 0
def cyclen_s(x):  # flow length days, normal 3-7
    if 3 <= x <= 7: return 100
    if x < 3:  return lin(x, 1, 3, 0, 100)
    return lin(x, 7, 12, 100, 0)
def follicle_s(c):
    if c < 8:  return 100
    if c < 12: return lin(c, 8, 12, 100, 70)
    if c < 20: return lin(c, 12, 20, 70, 30)
    if c < 25: return lin(c, 20, 25, 30, 10)
    return 0
def amh_cut(age):
    if age < 27: return 5.7
    if age < 35: return 4.55
    if age < 40: return 3.72
    return 4.0
def amh_s(a, age):
    cut = amh_cut(age)
    if a <= 0.5*cut: return 100
    if a <= cut:     return lin(a, 0.5*cut, cut, 100, 50)
    return lin(a, cut, 2*cut, 50, 0)
def lhfsh_s(lh, fsh):
    r = lh / fsh if fsh > 0 else 3.0
    if r <= 1: return 100
    if r <= 2: return lin(r, 1, 2, 100, 50)
    if r <= 3: return lin(r, 2, 3, 50, 20)
    return 0
def tsh_s(t):
    if 0.4 <= t <= 4.0: return 100
    if 0.1 <= t < 0.4 or 4.0 < t <= 10: return 50
    return 0
def prl_s(p):
    if p < 25: return 100
    if p < 50: return 60
    if p < 100: return 30
    return 0
def vitd_s(v):
    if v >= 30: return 100
    if v >= 20: return 70
    if v >= 12: return 40
    return 10

# ---------- sub-scores ----------
N = len(df)
def row_scores(i):
    metabolic = np.mean([bmi_s(V["bmi"][i]), wh_s(V["wh"][i]), rbs_s(V["rbs"][i]),
                         bp_s(V["sbp"][i], V["dbp"][i]), 0 if V["wtgain"][i] else 100])
    hyperand = clamp(100 - (40*V["hair"][i] + 25*V["skin"][i] + 20*V["acne"][i] + 15*V["hloss"][i]))
    regular = 100 if V["cyc"][i] == 2 else 0
    cycle = 0.8*regular + 0.2*cyclen_s(V["cyclen"][i])
    imaging = follicle_s(max(V["folL"][i], V["folR"][i]))
    hormonal = np.mean([amh_s(V["amh"][i], V["age"][i]), lhfsh_s(V["lh"][i], V["fsh"][i]),
                        tsh_s(V["tsh"][i]), prl_s(V["prl"][i]), vitd_s(V["vitd"][i])])
    lifestyle = np.mean([30 if V["fast"][i] else 100, 100 if V["exer"][i] else 40])
    total = (0.20*hyperand + 0.20*cycle + 0.20*imaging +
             0.20*metabolic + 0.12*hormonal + 0.08*lifestyle)
    return metabolic, hyperand, cycle, imaging, hormonal, lifestyle, total

cols = ["metabolic_score","hyperandrogenism_score","cycle_score","imaging_score",
        "hormonal_score","lifestyle_score","pcos_health_score"]
S = pd.DataFrame([row_scores(i) for i in range(N)],
                 columns=["metabolic_score","hyperandrogenism_score","cycle_score",
                          "imaging_score","hormonal_score","lifestyle_score","pcos_health_score"])
S = S.round(1)

def level(x):
    return ("Very Poor" if x < 20 else "Poor" if x < 40 else "Moderate"
            if x < 60 else "Good" if x < 80 else "Excellent")
S["health_level"] = S["pcos_health_score"].map(level)

# ---------- assemble output: id + label + cleaned features + scores ----------
out = pd.DataFrame({"Sl_No": V["sl"].astype(int), "PCOS_label": V["label"].astype(int)})
clean_feats = {
 "Age": "age","BMI":"bmi","Waist_Hip_Ratio":"wh","RBS_mg_dl":"rbs","BP_Systolic":"sbp",
 "BP_Diastolic":"dbp","Weight_gain":"wtgain","Hair_growth":"hair","Skin_darkening":"skin",
 "Hair_loss":"hloss","Pimples":"acne","Cycle_RI":"cyc","Cycle_length_days":"cyclen",
 "Follicle_L":"folL","Follicle_R":"folR","AMH":"amh","LH":"lh","FSH":"fsh","TSH":"tsh",
 "PRL":"prl","VitD3":"vitd","Fast_food":"fast","Reg_exercise":"exer",
}
for name, k in clean_feats.items():
    out[name] = V[k].round(3) if k not in binary else V[k].astype(int)
out = pd.concat([out, S], axis=1)
out.to_csv(OUT, index=False)

# ---------- validation: separation + AUC (rank-based, no sklearn) ----------
pos = out.loc[out.PCOS_label == 1, "pcos_health_score"].values
neg = out.loc[out.PCOS_label == 0, "pcos_health_score"].values
allv = out["pcos_health_score"].values
ranks = pd.Series(allv).rank().values
np_, nn = len(pos), len(neg)
# AUC for score predicting PCOS- (healthy); equivalently 1 - AUC(score->PCOS+)
sum_rank_neg = pd.Series(allv)[out.PCOS_label.values == 0].rank().sum()  # not used; do proper U
order = pd.Series(allv).rank().values
rneg = order[out.PCOS_label.values == 0].sum()
U_neg = rneg - nn*(nn+1)/2
auc_health = U_neg / (np_*nn)   # P(score_neg > score_pos): higher score => healthier => non-PCOS
report = {
 "n": int(N), "n_pcos_pos": int(np_), "n_pcos_neg": int(nn),
 "mean_score_PCOS_pos": round(float(pos.mean()),2),
 "mean_score_PCOS_neg": round(float(neg.mean()),2),
 "median_score_PCOS_pos": round(float(np.median(pos)),2),
 "median_score_PCOS_neg": round(float(np.median(neg)),2),
 "AUC_score_separates_label": round(float(auc_health),4),
 "subscore_means": {c: round(float(S[c].mean()),2) for c in cols},
 "level_distribution": out["health_level"].value_counts().to_dict(),
}
(ROOT/"data/combined/_anchor_validation.json").write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
print("WROTE", OUT, out.shape)
