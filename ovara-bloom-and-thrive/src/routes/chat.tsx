import { createFileRoute, Link } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Send } from "lucide-react";
import { PhoneFrame } from "@/components/ovara/PhoneFrame";
import { PlanUpdateCard } from "@/components/ovara/PlanUpdateCard";
import {
  computePhase,
  defaultPlan,
  getPlan,
  getProfile,
  getState,
  savePlan,
  type DailyPlan,
  type OvaraProfile,
  type PlanUpdate,
} from "@/lib/ovara-storage";
import mascot from "@/assets/mascot.png";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Check in with Ovara" },
      { name: "description", content: "Tell Ovara how your day is going." },
    ],
  }),
  component: ChatPage,
});

const QUICK_REPLIES = [
  "Had my breakfast 🥣",
  "Feeling tired today 😴",
  "Extra coffee oops ☕",
  "Skipped my workout",
  "Cramps showed up 🌸",
];

function ChatPage() {
  const [profile, setProfile] = useState<OvaraProfile | null>(null);
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [input, setInput] = useState("");

  useEffect(() => {
    const p = getProfile();
    setProfile(p);
    if (p) {
      let pl = getPlan();
      if (!pl) {
        pl = defaultPlan(p);
        savePlan(pl);
      }
      setPlan(pl);
    }
  }, []);

  const context = useMemo(() => {
    if (!profile || !plan) return null;
    const phase = computePhase(profile.cycleStartDate);
    const s = getState();
    return {
      profile: {
        name: profile.name,
        diagnosis: profile.diagnosis,
        symptoms: profile.symptoms,
        diet: profile.diet,
        fitness: profile.fitness,
      },
      cycle: { phase: phase.label, dayOfCycle: phase.dayOfCycle },
      plan: { meals: plan.meals.map((m) => `${m.label}: ${m.title}`), workout: plan.workout.title },
      today: { waterMl: s.waterMl, coffeeCount: s.coffeeCount, goalMl: plan.waterGoalMl },
    };
  }, [profile, plan]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({ context }),
      }),
    [context],
  );

  const { messages, sendMessage, status, error } = useChat({
    transport,
    messages: [
      {
        id: "welcome",
        role: "assistant",
        parts: [
          {
            type: "text",
            text: profile
              ? `hi ${profile.name} 🌸 how is your day going so far? you can tell me what you ate, how you're feeling, or just say hi.`
              : "hi lovely 🌸 how is your day going so far?",
          },
        ],
      } satisfies UIMessage,
    ],
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const isBusy = status === "submitted" || status === "streaming";

  const send = (text: string) => {
    if (!text.trim() || isBusy) return;
    sendMessage({ text: text.trim() });
    setInput("");
  };

  return (
    <PhoneFrame>
      <div className="flex flex-col h-screen md:h-[860px]">
        {/* Header */}
        <header className="p-5 border-b border-ink/5 flex items-center gap-3 bg-canvas">
          <Link to="/" className="size-10 rounded-2xl bg-white border border-ink/5 grid place-items-center text-ink/60" aria-label="Back">
            <ArrowLeft className="size-4" />
          </Link>
          <img src={mascot} alt="" width={40} height={40} className="size-10 object-contain" />
          <div className="flex-1 min-w-0">
            <p className="font-display text-lg text-ink leading-none">Ovara</p>
            <p className="text-[10px] text-ink/40 font-bold uppercase tracking-widest">always here</p>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 bg-canvas">
          {messages.map((m: UIMessage) => {
            const text = m.parts
              .filter((p: { type: string }) => p.type === "text")
              .map((p: { type: string; text?: string }) => ("text" in p ? p.text ?? "" : ""))
              .join("");

            // Extract any plan_update tool calls (any name starting with "tool-")
            const planUpdates: PlanUpdate[] = m.parts
              .filter((p: { type: string }) => p.type.startsWith("tool-") && (p as { input?: unknown }).input)
              .map((p) => (p as { input: PlanUpdate }).input);

            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={m.role === "user" ? "self-end max-w-[85%]" : "self-start max-w-[88%] w-full"}
              >
                {text && (
                  <div
                    className={
                      m.role === "user"
                        ? "bg-ink text-canvas px-4 py-3 rounded-3xl rounded-tr-md text-sm leading-relaxed"
                        : "bg-lavender/30 text-ink px-4 py-3 rounded-3xl rounded-tl-md text-sm leading-relaxed prose prose-sm max-w-none"
                    }
                  >
                    {m.role === "assistant" ? (
                      <ReactMarkdown>{text}</ReactMarkdown>
                    ) : (
                      text
                    )}
                  </div>
                )}
                {planUpdates.map((u, i) => (
                  <div key={i} className="mt-3">
                    <PlanUpdateCard update={u} />
                  </div>
                ))}
              </motion.div>
            );
          })}
          {status === "submitted" && (
            <div className="self-start bg-lavender/30 px-4 py-3 rounded-3xl rounded-tl-md text-sm text-ink/50">
              <span className="inline-flex gap-1">
                <Dot delay={0} /><Dot delay={0.15} /><Dot delay={0.3} />
              </span>
            </div>
          )}
          {error && (
            <div className="self-start bg-amber/20 border border-amber/40 px-4 py-3 rounded-2xl text-sm text-ink/70">
              I'm having a little trouble responding. Please try again in a moment.
            </div>
          )}
        </div>

        {/* Quick replies + composer */}
        <div className="p-4 border-t border-ink/5 bg-canvas space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                disabled={isBusy}
                className="whitespace-nowrap px-4 py-2 rounded-full bg-white border border-ink/10 text-xs font-semibold text-ink/70 active:scale-95 transition-transform disabled:opacity-40"
              >
                {q}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2 items-end"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tell Ovara…"
              className="flex-1 bg-white border border-ink/10 rounded-3xl px-5 py-4 text-sm text-ink outline-none focus:ring-2 focus:ring-lavender"
            />
            <button
              type="submit"
              disabled={!input.trim() || isBusy}
              className="size-12 rounded-2xl bg-ink text-canvas grid place-items-center active:scale-95 transition-transform disabled:opacity-30"
              aria-label="Send"
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </PhoneFrame>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <motion.span
      animate={{ y: [0, -3, 0] }}
      transition={{ duration: 0.9, repeat: Infinity, delay }}
      className="inline-block size-1.5 rounded-full bg-ink/50"
    />
  );
}