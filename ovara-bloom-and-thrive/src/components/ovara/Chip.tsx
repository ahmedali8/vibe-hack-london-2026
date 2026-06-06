import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes } from "react";

type Tone = "rose" | "lavender" | "sage" | "amber" | "neutral";

const toneClass: Record<Tone, string> = {
  rose: "bg-rose/60 text-ink",
  lavender: "bg-lavender/60 text-ink",
  sage: "bg-sage/60 text-ink",
  amber: "bg-amber/60 text-ink",
  neutral: "bg-white text-ink/60 border border-ink/10",
};

export function Chip({
  selected,
  tone = "neutral",
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean; tone?: Tone }) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        "px-5 py-3 rounded-full font-semibold text-sm transition-all active:scale-95",
        selected ? toneClass[tone === "neutral" ? "lavender" : tone] : toneClass.neutral,
        selected && "ring-2 ring-ink/10 shadow-sm",
        className,
      )}
    >
      {children}
    </button>
  );
}