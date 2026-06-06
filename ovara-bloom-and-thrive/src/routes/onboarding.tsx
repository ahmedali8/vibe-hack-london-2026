import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PhoneFrame } from "@/components/ovara/PhoneFrame";
import { Chip } from "@/components/ovara/Chip";
import { saveProfile, todayISO } from "@/lib/ovara-storage";
import mascot from "@/assets/mascot.png";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Welcome to Ovara" },
      { name: "description", content: "A few gentle questions so we can tailor your daily plan." },
    ],
  }),
  component: Onboarding,
});

type StepKey = "welcome" | "name" | "cycle" | "diagnosis" | "symptoms" | "diet" | "fitness";

const STEPS: StepKey[] = ["welcome", "name", "cycle", "diagnosis", "symptoms", "diet", "fitness"];

const SYMPTOM_OPTIONS = ["Cramps", "Bloating", "Fatigue", "Mood swings", "Acne", "Cravings", "Pelvic pain", "Brain fog", "Tender breasts", "Anxious"];
const DIAGNOSIS_OPTIONS = ["PCOS", "Endometriosis", "Both", "Suspected", "Just exploring"];
const CYCLE_OPTIONS = ["Regular", "Irregular", "Not sure", "Not menstruating"];
const DIET_OPTIONS = ["Omnivore", "Vegetarian", "Vegan", "Gluten-free", "Dairy-free", "No preference"];
const FITNESS_OPTIONS = ["Gentle", "Moderate", "Active"];

function Onboarding() {
  const navigate = useNavigate();
  const [stepIdx, setStepIdx] = useState(0);
  const [name, setName] = useState("");
  const [cycleStatus, setCycleStatus] = useState("");
  const [diagnosis, setDiagnosis] = useState<string[]>([]);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [diet, setDiet] = useState("");
  const [fitness, setFitness] = useState("");

  const step = STEPS[stepIdx];

  const toggle = (arr: string[], set: (a: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const canAdvance = (() => {
    switch (step) {
      case "welcome": return true;
      case "name": return name.trim().length > 0;
      case "cycle": return cycleStatus !== "";
      case "diagnosis": return diagnosis.length > 0;
      case "symptoms": return true; // optional
      case "diet": return diet !== "";
      case "fitness": return fitness !== "";
    }
  })();

  const finish = () => {
    saveProfile({
      name: name.trim() || "lovely",
      cycleStatus,
      diagnosis,
      symptoms,
      diet,
      fitness,
      cycleStartDate: todayISO(), // assume today is day 1; user can adjust later
      completedAt: new Date().toISOString(),
    });
    navigate({ to: "/" });
  };

  const next = () => {
    if (stepIdx === STEPS.length - 1) finish();
    else setStepIdx((i) => i + 1);
  };
  const back = () => setStepIdx((i) => Math.max(0, i - 1));

  return (
    <PhoneFrame>
      <div className="p-6 flex flex-col min-h-screen md:min-h-[860px]">
        {/* Progress + back */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={back}
            disabled={stepIdx === 0}
            className="size-10 rounded-2xl bg-white border border-ink/5 grid place-items-center text-ink/60 disabled:opacity-30"
            aria-label="Back"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="flex-1 flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= stepIdx ? "bg-ink/70" : "bg-ink/10"
                }`}
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col"
          >
            {step === "welcome" && (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <img src={mascot} alt="Ovara mascot" width={512} height={512} className="w-48 h-48 object-contain animate-float" />
                <h1 className="font-display text-4xl text-ink mt-6 leading-tight">
                  Welcome to <span className="text-rose">Ovara</span>
                </h1>
                <p className="text-ink/60 mt-4 max-w-[28ch]">
                  A soft, AI-tuned companion for PCOS and Endo. Let's tend to you, one gentle day at a time.
                </p>
              </div>
            )}

            {step === "name" && (
              <Section title="What should we call you?" subtitle="So we can greet you each morning.">
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your first name"
                  className="w-full bg-white border border-ink/10 rounded-3xl px-6 py-5 text-lg text-ink font-medium outline-none focus:ring-2 focus:ring-lavender"
                />
              </Section>
            )}

            {step === "cycle" && (
              <Section title="How's your cycle these days?" subtitle="No wrong answer.">
                <ChipWrap>
                  {CYCLE_OPTIONS.map((o) => (
                    <Chip key={o} tone="lavender" selected={cycleStatus === o} onClick={() => setCycleStatus(o)}>
                      {o}
                    </Chip>
                  ))}
                </ChipWrap>
              </Section>
            )}

            {step === "diagnosis" && (
              <Section title="What are you navigating?" subtitle="Pick anything that fits.">
                <ChipWrap>
                  {DIAGNOSIS_OPTIONS.map((o) => (
                    <Chip key={o} tone="rose" selected={diagnosis.includes(o)} onClick={() => toggle(diagnosis, setDiagnosis, o)}>
                      {o}
                    </Chip>
                  ))}
                </ChipWrap>
              </Section>
            )}

            {step === "symptoms" && (
              <Section title="Anything feeling loud lately?" subtitle="Tap any. You can skip this.">
                <ChipWrap>
                  {SYMPTOM_OPTIONS.map((o) => (
                    <Chip key={o} tone="sage" selected={symptoms.includes(o)} onClick={() => toggle(symptoms, setSymptoms, o)}>
                      {o}
                    </Chip>
                  ))}
                </ChipWrap>
              </Section>
            )}

            {step === "diet" && (
              <Section title="How do you eat?" subtitle="We'll tune meal ideas to fit.">
                <ChipWrap>
                  {DIET_OPTIONS.map((o) => (
                    <Chip key={o} tone="amber" selected={diet === o} onClick={() => setDiet(o)}>
                      {o}
                    </Chip>
                  ))}
                </ChipWrap>
              </Section>
            )}

            {step === "fitness" && (
              <Section title="How active are you feeling?" subtitle="We'll meet you where you are.">
                <ChipWrap>
                  {FITNESS_OPTIONS.map((o) => (
                    <Chip key={o} tone="lavender" selected={fitness === o} onClick={() => setFitness(o)}>
                      {o}
                    </Chip>
                  ))}
                </ChipWrap>
              </Section>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="pt-6">
          <button
            onClick={next}
            disabled={!canAdvance}
            className="w-full py-5 bg-ink text-canvas rounded-3xl font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-[0_8px_24px_-10px_rgba(0,0,0,0.4)] disabled:opacity-30"
          >
            {stepIdx === STEPS.length - 1 ? "Begin your day" : "Continue"}
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </PhoneFrame>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="font-display text-3xl text-ink leading-tight">{title}</h1>
      <p className="text-ink/60 mt-2 mb-8">{subtitle}</p>
      {children}
    </div>
  );
}

function ChipWrap({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}