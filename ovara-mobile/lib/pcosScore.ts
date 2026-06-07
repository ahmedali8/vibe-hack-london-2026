// In-app PCOS/PMOS health score (0-100, 100 = healthiest).
// Faithful TS port of data/scoring_rubric.md, tolerant of missing inputs:
// dimensions with no available data are dropped and the remaining weights
// renormalized. Mirrors data/provenance/build_anchor.py.
import type { HealthScore, OvaraProfile } from './storage';

const WEIGHTS = {
  hyperandrogenism: 0.2,
  cycle: 0.2,
  imaging: 0.2,
  metabolic: 0.2,
  hormonal: 0.12,
  lifestyle: 0.08,
};

const clamp = (x: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));
function lin(x: number, x0: number, x1: number, y0: number, y1: number): number {
  if (x1 === x0) return y0;
  const t = Math.min(Math.max((x - x0) / (x1 - x0), 0), 1);
  return y0 + (y1 - y0) * t;
}
const isNum = (v: unknown): v is number => typeof v === 'number' && !Number.isNaN(v);

// --- per-feature scorers (higher = healthier) ---
function bmiScore(b: number) {
  if (b < 17) return 50;
  if (b < 18.5) return 70;
  if (b < 25) return 100;
  if (b < 30) return 80;
  if (b < 35) return 50;
  if (b < 40) return 25;
  return 0;
}
function whScore(w: number) {
  if (w < 0.8) return 100;
  if (w < 0.85) return 75;
  if (w < 0.9) return 50;
  if (w < 0.95) return 25;
  return 0;
}
const rbsScore = (r: number) => (r < 140 ? 100 : r < 200 ? 50 : 0);
function bpScore(s: number, d: number) {
  if (s < 120 && d < 80) return 100;
  if (s < 130 && d < 80) return 80;
  if (s < 140 || d < 90) return 55;
  if (s < 160 || d < 100) return 30;
  return 0;
}
function cycleLenScore(days: number) {
  // full cycle length; healthy 21-35
  if (days >= 21 && days <= 35) return 100;
  if (days < 21) return lin(days, 14, 21, 0, 100);
  return lin(days, 35, 60, 100, 0);
}
function follicleScore(c: number) {
  if (c < 8) return 100;
  if (c < 12) return lin(c, 8, 12, 100, 70);
  if (c < 20) return lin(c, 12, 20, 70, 30);
  if (c < 25) return lin(c, 20, 25, 30, 10);
  return 0;
}
function amhCutoff(age?: number) {
  if (!isNum(age)) return 4.0;
  if (age < 27) return 5.7;
  if (age < 35) return 4.55;
  if (age < 40) return 3.72;
  return 4.0;
}
function amhScore(a: number, age?: number) {
  const cut = amhCutoff(age);
  if (a <= 0.5 * cut) return 100;
  if (a <= cut) return lin(a, 0.5 * cut, cut, 100, 50);
  return lin(a, cut, 2 * cut, 50, 0);
}
function lhFshScore(lh: number, fsh: number) {
  const r = fsh > 0 ? lh / fsh : 3;
  if (r <= 1) return 100;
  if (r <= 2) return lin(r, 1, 2, 100, 50);
  if (r <= 3) return lin(r, 2, 3, 50, 20);
  return 0;
}
function tshScore(t: number) {
  if (t >= 0.4 && t <= 4.0) return 100;
  if ((t >= 0.1 && t < 0.4) || (t > 4.0 && t <= 10)) return 50;
  return 0;
}
const prlScore = (p: number) => (p < 25 ? 100 : p < 50 ? 60 : p < 100 ? 30 : 0);
const vitDScore = (v: number) => (v >= 30 ? 100 : v >= 20 ? 70 : v >= 12 ? 40 : 10);

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export function levelFor(x: number): string {
  return x < 20 ? 'Very Poor' : x < 40 ? 'Poor' : x < 60 ? 'Moderate' : x < 80 ? 'Good' : 'Excellent';
}

export function scorePcos(profile: OvaraProfile): HealthScore {
  const c = profile.clinical ?? {};
  const dims: Record<string, number> = {};

  // metabolic
  const metab: number[] = [];
  if (isNum(c.heightCm) && isNum(c.weightKg) && c.heightCm > 0) {
    const bmi = c.weightKg / (c.heightCm / 100) ** 2;
    metab.push(bmiScore(bmi));
  }
  if (isNum(c.waistCm) && isNum(c.hipCm) && c.hipCm > 0) metab.push(whScore(c.waistCm / c.hipCm));
  if (isNum(c.randomGlucose)) metab.push(rbsScore(c.randomGlucose));
  if (isNum(c.bpSystolic) && isNum(c.bpDiastolic)) metab.push(bpScore(c.bpSystolic, c.bpDiastolic));
  if (typeof c.weightGain === 'boolean') metab.push(c.weightGain ? 0 : 100);
  if (metab.length) dims.metabolic = mean(metab);

  // hyperandrogenism — only when the androgen-signs step was completed (>=1 flag set).
  // Empty symptoms must NOT be read as "confirmed no signs".
  const hasAndrogen = [c.hairGrowth, c.skinDarkening, c.acne, c.hairLoss].some(
    (v) => typeof v === 'boolean'
  );
  if (hasAndrogen) {
    const acne = typeof c.acne === 'boolean' ? c.acne : profile.symptoms?.includes('Acne');
    const pen = 40 * (c.hairGrowth ? 1 : 0) + 25 * (c.skinDarkening ? 1 : 0) +
      20 * (acne ? 1 : 0) + 15 * (c.hairLoss ? 1 : 0);
    dims.hyperandrogenism = clamp(100 - pen);
  }

  // cycle — regularity (from cycleStatus) + optional length
  const cyc: { s: number; w: number }[] = [];
  if (profile.cycleStatus) {
    const reg = profile.cycleStatus === 'Regular' ? 100 : profile.cycleStatus === 'Not sure' ? 50 : 0;
    cyc.push({ s: reg, w: 0.8 });
  }
  if (isNum(c.cycleLengthDays)) cyc.push({ s: cycleLenScore(c.cycleLengthDays), w: 0.2 });
  if (cyc.length) {
    const wsum = cyc.reduce((a, x) => a + x.w, 0);
    dims.cycle = cyc.reduce((a, x) => a + x.s * x.w, 0) / wsum;
  }

  // imaging — follicle count (rarely known)
  if (isNum(c.follicleCount)) dims.imaging = follicleScore(c.follicleCount);

  // hormonal
  const horm: number[] = [];
  if (isNum(c.amh)) horm.push(amhScore(c.amh, c.age));
  if (isNum(c.lh) && isNum(c.fsh)) horm.push(lhFshScore(c.lh, c.fsh));
  if (isNum(c.tsh)) horm.push(tshScore(c.tsh));
  if (isNum(c.prl)) horm.push(prlScore(c.prl));
  if (isNum(c.vitD)) horm.push(vitDScore(c.vitD));
  if (horm.length) dims.hormonal = mean(horm);

  // lifestyle — exercise (from fitness) + optional fast food
  const life: number[] = [];
  if (profile.fitness) {
    const f = profile.fitness.toLowerCase();
    life.push(f === 'active' || f === 'moderate' ? 100 : 40);
  }
  if (typeof c.fastFood === 'boolean') life.push(c.fastFood ? 30 : 100);
  if (life.length) dims.lifestyle = mean(life);

  // weighted total over available dimensions, renormalized
  const keys = Object.keys(dims) as (keyof typeof WEIGHTS)[];
  const wsum = keys.reduce((a, k) => a + WEIGHTS[k], 0);
  const total = wsum > 0 ? keys.reduce((a, k) => a + dims[k] * WEIGHTS[k], 0) / wsum : 0;

  const subscores: Record<string, number> = {};
  for (const k of keys) subscores[k] = Math.round(dims[k] * 10) / 10;

  return {
    total: Math.round(total * 10) / 10,
    level: levelFor(total),
    subscores,
    completeness: Math.round((keys.length / 6) * 100) / 100,
  };
}
