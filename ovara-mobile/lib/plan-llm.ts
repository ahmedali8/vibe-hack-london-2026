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
  llmError: string | null;
  fromLlm: boolean;
};

export async function loadPlanWithLlm(forceRefresh = false): Promise<PlanLoadResult | null> {
  const profile = await getProfile();
  if (!profile) return null;

  const state = await getState();
  let plan = (await getPlan()) ?? defaultPlan(profile);
  const llmReady = hasLlmApiKey();
  let llmError: string | null = null;
  let fromLlm = plan.source === 'llm';

  if (!llmReady) {
    llmError = 'Add EXPO_PUBLIC_GLM_API_KEY (or EXPO_PUBLIC_CLAUDE_API_KEY) in .env for personalized plans.';
  }

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
        llmError = null;
      } else {
        llmError = 'Could not parse AI plan — showing defaults.';
        if (forceRefresh && plan.source !== 'llm') {
          plan = defaultPlan(profile);
          await savePlan(plan);
        }
        fromLlm = false;
      }
    } catch (err) {
      llmError = err instanceof Error ? err.message : 'AI plan failed';
      fromLlm = plan.source === 'llm';
    }
  }

  return { plan, profile, llmReady, llmError, fromLlm };
}
