import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { BREATHING_PLANS, type BreathingPlan } from "@/lib/care-recs";

export function BreathingSession({
  plan = BREATHING_PLANS["slow"]!,
  onClose,
}: {
  plan?: BreathingPlan | undefined;
  onClose: () => void;
}) {
  const phases = plan.phases;
  const [phase, setPhase] = useState(0);
  const [left, setLeft] = useState<number>(phases[0]!.seconds);
  const [cycles, setCycles] = useState(0);
  const phaseRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      setLeft((prev) => {
        if (prev > 1) return prev - 1;
        const next = (phaseRef.current + 1) % phases.length;
        phaseRef.current = next;
        setPhase(next);
        if (next === 0) setCycles((c) => c + 1);
        return phases[next]!.seconds;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phases]);

  const current = phases[phase]!;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 px-6 backdrop-blur-xl">
      <button
        onClick={onClose}
        aria-label="结束练习"
        className="absolute right-5 top-5 rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary"
      >
        <X className="h-5 w-5" />
      </button>

      <p className="mb-8 font-display text-lg font-semibold">{plan.title}</p>

      <div className="flex h-64 w-64 items-center justify-center">
        <div
          className="flex h-64 w-64 items-center justify-center rounded-full bg-primary-soft"
          style={{
            transform: `scale(${current.scale})`,
            transition: `transform ${current.seconds}s ease-in-out`,
          }}
        >
          <div className="text-center">
            <p className="font-display text-2xl font-semibold">{current.name}</p>
            <p className="mt-1 text-4xl font-light tabular-nums">{left}</p>
          </div>
        </div>
      </div>

      <p className="mt-10 text-sm text-muted-foreground">{plan.rhythm}</p>
      <p className="mt-2 text-sm text-muted-foreground">已完成 {cycles} 个循环</p>
      <button
        onClick={onClose}
        className="mt-8 rounded-full border border-border px-6 py-2.5 text-sm transition-colors hover:bg-secondary"
      >
        结束练习
      </button>
    </div>
  );
}
