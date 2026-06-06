import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { PhoneFrame } from "@/components/ovara/PhoneFrame";
import {
  computePhase,
  defaultPlan,
  getPlan,
  getProfile,
  getState,
  saveState,
  type OvaraProfile,
} from "@/lib/ovara-storage";

export const Route = createFileRoute("/reflection")({
  head: () => ({
    meta: [
      { title: "Reflect on today" },
      { name: "description", content: "A soft wrap-up for your day." },
    ],
  }),
  component: Reflection,
});

const MOODS = [
  { emoji: "🌧️", label: "Heavy" },
  { emoji: "☁️", label: "Tender" },
  { emoji: "🌸", label: "Soft" },
  { emoji: "✨", label: "Bright" },
  { emoji: "🌞", label: "Radiant" },
];

function Reflection() {
  const [profile, setProfile] = useState<OvaraProfile | null>(null);
  const [mood, setMood] = useState<string | undefined>();

  useEffect(() => {
    setProfile(getProfile());
    const s = getState();
    setMood(s.mood);
  }, []);

  if (!profile) {
    return (
      <PhoneFrame>
        <div className="p-6 flex items-center justify-center h-full text-ink/40">…</div>
      </PhoneFrame>
    );
  }

  const phase = computePhase(profile.cycleStartDate);
  const plan = getPlan() ?? defaultPlan(profile);
  const state = getState();

  const pickMood = (m: string) => {
    setMood(m);
    saveState({ ...state, mood: m });
  };

  const insight = buildInsight(profile, state, plan.waterGoalMl);

  return (
    <PhoneFrame>
      <div className="p-6 flex flex-col min-h-screen md:min-h-[860px]">
        <Link to="/" className="size-10 rounded-2xl bg-white border border-ink/5 grid place-items-center text-ink/60 self-start" aria-label="Back">
          <ArrowLeft className="size-4" />
        </Link>

        <div className="mt-8">
          <p className="text-xs font-bold text-ink/40 uppercase tracking-widest">Evening reflection</p>
          <h1 className="font-display text-4xl text-ink leading-tight mt-2">
            Rest well, {profile.name}.
          </h1>
          <p className="text-ink/60 mt-3">How would you describe your day?</p>
        </div>

        <div className="flex justify-between mt-8 mb-10">
          {MOODS.map((m) => (
            <motion.button
              key={m.label}
              whileTap={{ scale: 0.85 }}
              onClick={() => pickMood(m.label)}
              className={`flex flex-col items-center gap-2 ${mood === m.label ? "" : "opacity-60"}`}
            >
              <div
                className={`size-14 rounded-2xl grid place-items-center text-2xl transition-all ${
                  mood === m.label ? "bg-rose/50 ring-2 ring-rose" : "bg-white border border-ink/5"
                }`}
              >
                {m.emoji}
              </div>
              <span className="text-[10px] font-bold text-ink/50 uppercase tracking-wider">{m.label}</span>
            </motion.button>
          ))}
        </div>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-[32px] bg-ink text-canvas p-7 mb-6"
        >
          <p className="text-[10px] font-bold text-sage uppercase tracking-widest mb-3">Today's insight</p>
          <p className="font-display text-xl leading-snug">{insight.title}</p>
          <p className="text-canvas/60 text-sm mt-3 leading-relaxed">{insight.body}</p>
        </motion.section>

        <div className="mt-auto">
          <p className="text-[10px] font-bold text-ink/40 uppercase tracking-widest mb-3">Tomorrow's preview</p>
          <div className="rounded-3xl bg-lavender/25 border border-lavender/30 p-5 flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-white grid place-items-center text-xl">{phase.emoji}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-ink truncate">{phase.label}</p>
              <p className="text-xs text-ink/60 truncate">{phase.blurb}</p>
            </div>
          </div>
        </div>

        <Link
          to="/"
          className="mt-6 w-full py-5 bg-ink text-canvas rounded-3xl font-bold text-center active:scale-[0.98] transition-transform"
        >
          Sleep well 🌙
        </Link>
      </div>
    </PhoneFrame>
  );
}

function buildInsight(profile: OvaraProfile, state: { waterMl: number; coffeeCount: number }, goal: number) {
  const waterPct = Math.round((state.waterMl / goal) * 100);
  if (state.coffeeCount >= 3) {
    return {
      title: `${state.coffeeCount} coffees today — that's a lot for your cycle.`,
      body: "Caffeine can rile up cortisol, especially with PCOS or Endo. Maybe try one fewer tomorrow and see how it lands.",
    };
  }
  if (waterPct < 60) {
    return {
      title: `You sipped about ${waterPct}% of your water goal.`,
      body: "Hydration is a quiet kindness for hormones. Try a glass with each meal tomorrow.",
    };
  }
  return {
    title: "You showed up for yourself today.",
    body: `Small steady moves matter more than big ones, especially in your ${profile.cycleStatus.toLowerCase()} cycle. Proud of you.`,
  };
}