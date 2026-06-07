import {
  applyLlmPlan,
  generatePersonalizedPlan,
  hasLlmApiKey,
} from './llm';
import {
  computePhase,
  defaultPlan,
  getPlan,
  getProfile,
  getState,
  savePlan,
  type DailyPlan,
  type OvaraProfile,
} from './storage';
import { selectFoods } from './selectFoods';
import { scorePcos } from './pcosScore';
import { PCOS_GUIDANCE } from './pcosGuidance';

export type PlanLoadResult = {
  plan: DailyPlan;
  profile: OvaraProfile;
  llmReady: boolean;
  fromLlm: boolean;
};

export async function loadPlanWithLlm(forceRefresh = false): Promise<PlanLoadResult | null> {
  const profile = await getProfile();
  if (!profile) return null;

  const state = await getState();
  let plan = (await getPlan()) ?? defaultPlan(profile);
  const llmReady = hasLlmApiKey();
  let fromLlm = plan.source === 'llm';

  const needsLlm = llmReady && (forceRefresh || plan.source !== 'llm');

  if (needsLlm) {
    try {
      const phase = computePhase(profile.cycleStartDate);
      const foods = selectFoods(profile.diet);
      const healthScore = profile.healthScore ?? scorePcos(profile);
      const llm = await generatePersonalizedPlan({
        profile,
        phase,
        state,
        foods,
        guidance: PCOS_GUIDANCE,
        healthScore,
      });
      if (llm) {
        plan = applyLlmPlan({ ...plan, date: state.date }, llm);
        await savePlan(plan);
        fromLlm = true;
      } else {
        // Generation returned nothing usable — silently keep defaults (no UI error).
        console.warn('Plan generation returned no usable result; using defaults.');
        if (forceRefresh && plan.source !== 'llm') {
          plan = defaultPlan(profile);
          await savePlan(plan);
        }
        fromLlm = false;
      }
    } catch (err) {
      // Provider/network error — silently fall back to current plan, log only.
      console.warn('Plan generation failed:', err instanceof Error ? err.message : err);
      fromLlm = plan.source === 'llm';
    }
  }

  return { plan, profile, llmReady, fromLlm };
}
