// Select a compact, diet-appropriate, role-balanced shortlist from the PCOS
// food bank to ground the plan LLM. Keeps the prompt small and the model
// honest (it builds meals from real, PCOS-scored foods).
import { FOOD_BANK, type BankFood } from './foodBank';

const ROLE_QUOTA: Record<string, number> = {
  veg: 6,
  protein: 6,
  fruit: 4,
  nut_seed: 4,
  grain: 4,
  dairy: 3,
  fat: 2,
};

function dietFilter(diet: string): (f: BankFood) => boolean {
  const d = (diet ?? '').toLowerCase();
  if (d.includes('vegan')) return (f) => f.vegan;
  if (d.includes('vegetarian')) return (f) => f.vegetarian;
  if (d.includes('gluten')) return (f) => f.glutenFree;
  if (d.includes('dairy')) return (f) => f.dairyFree;
  return () => true; // omnivore / no preference
}

export function selectFoods(diet: string): BankFood[] {
  const pool = FOOD_BANK.filter(dietFilter(diet));
  const out: BankFood[] = [];
  for (const [role, quota] of Object.entries(ROLE_QUOTA)) {
    const top = pool
      .filter((f) => f.role === role)
      .sort((a, b) => b.score - a.score)
      .slice(0, quota);
    out.push(...top);
  }
  return out;
}

// Compact one-line-per-food rendering for the LLM prompt.
export function foodsForPrompt(foods: BankFood[]): string {
  return foods
    .map((f) => `- ${f.name} [PCOS ${f.score}, ${f.kcal}kcal, protein ${f.protein}g, fiber ${f.fiber}g, sugar ${f.sugar}g]`)
    .join('\n');
}
