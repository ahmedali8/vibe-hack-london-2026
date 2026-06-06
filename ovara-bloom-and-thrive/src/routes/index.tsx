import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MessageCircleHeart, Plus, Coffee, Droplet, Moon } from "lucide-react";
import { PhoneFrame } from "@/components/ovara/PhoneFrame";
import {
  computePhase,
  defaultPlan,
  getPlan,
  getProfile,
  getState,
  savePlan,
  saveState,
  type DailyPlan,
  type DailyState,
  type OvaraProfile,
} from "@/lib/ovara-storage";
import phaseOrb from "@/assets/phase-orb.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ovara — Today" },
      { name: "description", content: "Your soft, AI-tuned plan for today." },
    ],
  }),
  component: Dashboard,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<OvaraProfile | null>(null);
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [state, setState] = useState<DailyState | null>(null);

  useEffect(() => {
    const p = getProfile();
    if (!p) {
      navigate({ to: "/onboarding" });
      return;
    }
    setProfile(p);
    let existing = getPlan();
    if (!existing) {
      existing = defaultPlan(p);
      savePlan(existing);
    }
    setPlan(existing);
    setState(getState());
  }, [navigate]);

  if (!profile || !plan || !state) {
    return (
      <PhoneFrame>
        <div className="flex items-center justify-center min-h-screen text-ink/40">…</div>
      </PhoneFrame>
    );
  }

  const phaseInfo = computePhase(profile.cycleStartDate);

  const addWater = () => {
    const next = { ...state, waterMl: state.waterMl + 250 };
    setState(next);
    saveState(next);
  };
  const addCoffee = () => {
    const next = { ...state, coffeeCount: state.coffeeCount + 1 };
    setState(next);
    saveState(next);
  };

  const waterPct = Math.min(100, Math.round((state.waterMl / plan.waterGoalMl) * 100));
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <PhoneFrame>
      <div className="p-6 pb-32 flex flex-col gap-6">
        {/* Greeting */}
        <header className="flex justify-between items-start mt-4">
          <div>
            <p className="text-xs font-bold text-ink/40 uppercase tracking-widest">{today}</p>
            <h1 className="font-display text-3xl text-ink mt-1">
              {greeting()}, {profile.name} ✨
            </h1>
            <p className="text-sm text-ink/60 mt-1">Here's your soft start to the day.</p>
          </div>
          <Link
            to="/reflection"
            className="size-11 rounded-2xl bg-white border border-ink/5 grid place-items-center text-ink/60 shrink-0"
            aria-label="Reflection"
          >
            <Moon className="size-5" />
          </Link>
        </header>

        {/* Cycle phase hero */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="rounded-[36px] bg-lavender/20 border border-lavender/30 p-6 text-center relative overflow-hidden"
        >
          <div className="flex justify-center mb-2">
            <motion.img
              src={phaseOrb}
              alt=""
              width={768}
              height={768}
              className="w-40 h-40 object-contain"
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          <p className="text-[10px] font-bold text-ink/40 uppercase tracking-widest">Current phase · day {phaseInfo.dayOfCycle}</p>
          <h2 className="font-display text-2xl text-ink mt-1">
            {phaseInfo.label} {phaseInfo.emoji}
          </h2>
          <p className="text-sm text-ink/60 mt-2 max-w-[28ch] mx-auto">{phaseInfo.blurb}</p>
        </motion.section>

        {/* Diet card */}
        <section className="rounded-[28px] bg-white border border-ink/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold text-ink/40 uppercase tracking-widest">Today's nourishment</p>
              <h3 className="font-display text-xl text-ink">Anti-inflammatory plan</h3>
            </div>
            <span className="text-2xl">🥗</span>
          </div>
          <ul className="space-y-3">
            {plan.meals.map((m) => (
              <li key={m.id} className="flex gap-3 items-start">
                <div className="size-10 rounded-2xl bg-rose/30 grid place-items-center text-lg shrink-0">
                  {m.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-ink/40 uppercase tracking-wider">{m.label}</p>
                  <p className="text-sm font-semibold text-ink truncate">{m.title}</p>
                  <p className="text-xs text-ink/50 truncate">{m.note}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Workout card */}
        <section className="rounded-[28px] bg-sage/20 border border-sage/30 p-5 flex items-center gap-4">
          <div className="size-14 rounded-2xl bg-white grid place-items-center text-2xl shrink-0">
            {plan.workout.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-ink/40 uppercase tracking-widest">Movement</p>
            <p className="font-semibold text-ink">{plan.workout.title}</p>
            <p className="text-xs text-ink/60">
              {plan.workout.duration} · {plan.workout.intensity}
            </p>
          </div>
        </section>

        {/* Hydration tracker */}
        <section className="rounded-[28px] bg-amber/15 border border-amber/40 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold text-ink/40 uppercase tracking-widest">Hydration</p>
              <p className="font-semibold text-ink">
                {(state.waterMl / 1000).toFixed(1)}L of {(plan.waterGoalMl / 1000).toFixed(1)}L
              </p>
            </div>
            <div className="text-sm font-bold text-ink/60">{waterPct}%</div>
          </div>
          <div className="h-2 bg-white/60 rounded-full overflow-hidden mb-4">
            <motion.div
              className="h-full bg-amber"
              initial={{ width: 0 }}
              animate={{ width: `${waterPct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={addWater}
              className="flex-1 py-3 rounded-2xl bg-white border border-amber/40 text-ink font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <Droplet className="size-4" /> +250 ml
            </button>
            <button
              onClick={addCoffee}
              className="px-4 py-3 rounded-2xl bg-white border border-amber/40 text-ink font-semibold text-sm flex items-center gap-2 active:scale-[0.98] transition-transform"
            >
              <Coffee className="size-4" /> {state.coffeeCount}
            </button>
          </div>
        </section>
      </div>

      {/* Floating chat button */}
      <Link
        to="/chat"
        className="fixed md:absolute bottom-6 right-6 size-16 rounded-full bg-ink text-canvas grid place-items-center shadow-[0_10px_30px_-10px_rgba(0,0,0,0.4)] active:scale-95 transition-transform"
        aria-label="Check in with Ovara"
      >
        <MessageCircleHeart className="size-7" />
      </Link>
    </PhoneFrame>
  );
}
