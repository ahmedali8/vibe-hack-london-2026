import { type ReactNode } from "react";

// Mobile-first single-column wrapper. On larger screens we frame it as a phone
// to keep the warm, intimate scale.
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-canvas flex justify-center md:py-10">
      <div className="w-full md:max-w-[440px] md:rounded-[40px] md:shadow-[0_20px_80px_-30px_rgba(120,60,80,0.25)] md:ring-1 md:ring-black/5 bg-canvas md:overflow-hidden relative min-h-screen md:min-h-[860px]">
        {children}
      </div>
    </div>
  );
}