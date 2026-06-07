#!/usr/bin/env python3
"""Score USDA whole foods for PCOS diet quality -> data/combined/food_scored.csv
Implements scoring_rubric.md section 2. Amounts are per 100 g. 100 = best."""
import pandas as pd, numpy as np, json
from pathlib import Path

ROOT = Path("/Users/ahmedali/scorpio/vibe-hack")
RELEASES = {
 "foundation": ROOT/"data/FoodData_Central_foundation_food_csv_2026-04-30",
 "sr_legacy":  ROOT/"data/FoodData_Central_sr_legacy_food_csv_2018-04",
 "survey":     ROOT/"data/FoodData_Central_survey_food_csv_2024-10-31",
}
OUT = ROOT/"data/combined/food_scored.csv"

# Resolve nutrients BY NAME per release (Foundation/SR use ids 1008..., Survey/FNDDS
# uses legacy nutrient_nbr 208...). target column -> accepted nutrient names.
TARGETS = {
 "energy_kcal": {"Energy"},                       # disambiguated by unit KCAL below
 "protein_g":   {"Protein"},
 "fat_g":       {"Total lipid (fat)"},
 "carb_g":      {"Carbohydrate, by difference"},
 "fiber_g":     {"Fiber, total dietary"},
 "sugar_g":     {"Total Sugars", "Sugars, total including NLEA"},
 "addsugar_g":  {"Sugars, added", "Added Sugars"},
 "satfat_g":    {"Fatty acids, total saturated"},
 "trans_g":     {"Fatty acids, total trans"},
 "sodium_mg":   {"Sodium, Na"},
 "mufa_g":      {"Fatty acids, total monounsaturated"},
 "pufa_g":      {"Fatty acids, total polyunsaturated"},
}
# canonical consumable food types only (drops sub_sample/market/agricultural provenance rows)
FOOD_TYPES = {"foundation_food","sr_legacy_food","survey_fndds_food"}

def int_set(s):
    s = pd.to_numeric(s, errors="coerce").dropna()
    return {int(x) for x in s if float(x).is_integer()}

def nutrient_id_map(d):
    """nutrient_id (as used in this release's food_nutrient.csv) -> target column."""
    nut = pd.read_csv(d/"nutrient.csv", usecols=["id","name","unit_name","nutrient_nbr"])
    fn_ids = set(pd.read_csv(d/"food_nutrient.csv", usecols=["nutrient_id"],
                             dtype={"nutrient_id":"int64"}).nutrient_id.unique())
    # which column of nutrient.csv does food_nutrient.nutrient_id reference?
    key = "id" if len(fn_ids & int_set(nut["id"])) >= \
                  len(fn_ids & int_set(nut["nutrient_nbr"])) else "nutrient_nbr"
    out = {}
    for tgt, names in TARGETS.items():
        rows = nut[nut.name.isin(names)]
        if tgt == "energy_kcal":
            kc = rows[rows.unit_name.str.upper() == "KCAL"]
            rows = kc if len(kc) else rows
        for _, r in rows.iterrows():
            k = r[key]
            if pd.notna(k) and float(k).is_integer():
                out[int(k)] = tgt
    return out

def load(rel, d):
    food = pd.read_csv(d/"food.csv", usecols=["fdc_id","data_type","description",
                       "food_category_id"], dtype={"fdc_id":"int64"}, low_memory=False)
    food = food[food.data_type.isin(FOOD_TYPES)]
    idmap = nutrient_id_map(d)
    fn = pd.read_csv(d/"food_nutrient.csv", usecols=["fdc_id","nutrient_id","amount"],
                     dtype={"fdc_id":"int64","nutrient_id":"int64","amount":"float64"})
    fn = fn[fn.nutrient_id.isin(idmap)]
    fn["target"] = fn.nutrient_id.map(idmap)
    piv = fn.pivot_table(index="fdc_id", columns="target", values="amount", aggfunc="first").reset_index()
    m = food.merge(piv, on="fdc_id", how="left")
    # readable category
    try:
        cat = pd.read_csv(d/"food_category.csv", usecols=["id","description"]).rename(
            columns={"id":"food_category_id","description":"food_category"})
        m = m.merge(cat, on="food_category_id", how="left")
    except Exception:
        m["food_category"] = np.nan
    m["release"] = rel
    return m

frames = [load(rel, d) for rel, d in RELEASES.items()]
df = pd.concat(frames, ignore_index=True)
NCOLS = list(TARGETS)
for c in NCOLS:
    if c not in df: df[c] = np.nan
g = df.fillna({c:0.0 for c in NCOLS})
g["unsat_g"] = g["mufa_g"] + g["pufa_g"]
g["netcarb_g"] = (g["carb_g"] - g["fiber_g"]).clip(lower=0)

def mn(a,b): return np.minimum(a,b)
score = (50
 + mn(2.0*g["fiber_g"],   20)
 + mn(0.5*g["protein_g"], 15)
 + mn(0.4*g["unsat_g"],   10)
 - mn(0.6*g["sugar_g"],   25)
 - mn(1.0*g["addsugar_g"],20)
 - mn(1.0*g["satfat_g"],  15)
 - mn(5.0*g["trans_g"],   10)
 - mn(g["sodium_mg"]/100, 15)
 - mn(0.2*g["netcarb_g"], 15))
df["pcos_diet_score"] = score.clip(0,100).round(1)
df["level"] = pd.cut(df["pcos_diet_score"], [-.1,20,40,60,80,100],
                     labels=["Very Poor","Poor","Moderate","Good","Excellent"])

keep = ["fdc_id","description","release","food_category","energy_kcal","protein_g","fat_g",
        "carb_g","fiber_g","sugar_g","satfat_g","trans_g","sodium_mg","mufa_g","pufa_g",
        "pcos_diet_score","level"]
out = df[keep].copy()
for c in ["energy_kcal","protein_g","fat_g","carb_g","fiber_g","sugar_g","satfat_g",
          "trans_g","sodium_mg","mufa_g","pufa_g"]:
    out[c] = out[c].round(2)
out.to_csv(OUT, index=False)

rep = {
 "n_foods": int(len(out)),
 "by_release": out.release.value_counts().to_dict(),
 "score_mean": round(float(out.pcos_diet_score.mean()),2),
 "level_distribution": out.level.value_counts().to_dict(),
 "top5": out.nlargest(5,"pcos_diet_score")[["description","pcos_diet_score"]].values.tolist(),
 "bottom5": out.nsmallest(5,"pcos_diet_score")[["description","pcos_diet_score"]].values.tolist(),
}
(ROOT/"data/combined/_food_validation.json").write_text(json.dumps(rep, indent=2, default=str))
print(json.dumps(rep, indent=2, default=str))
print("WROTE", OUT, out.shape)
