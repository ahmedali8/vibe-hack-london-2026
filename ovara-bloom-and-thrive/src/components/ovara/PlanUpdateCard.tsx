import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { PlanUpdate } from "@/lib/ovara-storage";

export function PlanUpdateCard({
  update,
  onDismiss,
}: {
  update: PlanUpdate | null;
  onDismiss?: () => void;
}) {
  return (
    <AnimatePresence>
      {update && (
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
          className="rounded-[28px] bg-white p-6 border border-lavender/40 shadow-[0_10px_40px_-15px_rgba(160,120,180,0.35)]"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-2xl bg-amber/40 grid place-items-center">
              <Sparkles className="size-5 text-ink/70" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-ink/40 uppercase tracking-widest">Plan updated</p>
              <h3 className="font-display text-lg leading-tight text-ink">{update.title}</h3>
            </div>
          </div>
          <p className="text-sm text-ink/70 leading-relaxed mb-4">{update.reason}</p>
          <div className="space-y-2">
            {update.changes.map((c, i) => (
              <div key={i} className="p-3 rounded-2xl bg-lavender/15 border border-lavender/30">
                <p className="text-[10px] font-bold text-ink/40 uppercase tracking-wider mb-1">{c.label}</p>
                {c.before && (
                  <p className="text-xs text-ink/40 line-through">{c.before}</p>
                )}
                <p className="text-sm text-ink font-medium">{c.after}</p>
              </div>
            ))}
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="mt-5 w-full py-3 rounded-2xl bg-ink text-canvas text-sm font-bold active:scale-[0.98] transition-transform"
            >
              Got it, thanks
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}