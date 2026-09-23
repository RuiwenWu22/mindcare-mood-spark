import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { BREATHING_PLANS, type BreathingPlan } from "@/lib/care-recs";

export type BreathingResult = { elapsed: number; completed: boolean };

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

export function BreathingSession({
  plan = BREATHING_PLANS["slow"]!,
  onClose,
  targetSeconds = 120,
}: {
  plan?: BreathingPlan | undefined;
  onClose: (result: BreathingResult) => void;
  targetSeconds?: number;
}) {
  const phases = plan.phases;
  const [phase, setPhase] = useState(0);
  const [left, setLeft] = useState<number>(phases[0]!.seconds);
  const [cycles, setCycles] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const t = useRef({ phase: 0, left: phases[0]!.seconds, cycles: 0, elapsed: 0 });

  useEffect(() => {
    setReduceMotion(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  }, []);

  useEffect(() => {
    if (done) return;
    const id = window.setInterval(() => {
      const s = t.current;
      s.elapsed += 1;
      s.left -= 1;
      if (s.left <= 0) {
        s.phase = (s.phase + 1) % phases.length;
        s.left = phases[s.phase]!.seconds;
        if (s.phase === 0) {
          s.cycles += 1;
          // 到时间后，等当前这一轮呼吸完整结束再收尾
          if (s.elapsed >= targetSeconds) setDone(true);
        }
      }
      setPhase(s.phase);
      setLeft(s.left);
      setCycles(s.cycles);
      setElapsed(s.elapsed);
    }, 1000);
    return () => window.clearInterval(id);
  }, [phases, targetSeconds, done]);

  const current = phases[phase]!;
  const remaining = Math.max(0, targetSeconds - elapsed);
  const close = () => onClose({ elapsed: t.current.elapsed, completed: done });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={plan.title}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 px-6 backdrop-blur-xl"
    >
      <button
        onClick={close}
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
            transform: `scale(${done ? 0.85 : current.scale})`,
            transition: reduceMotion ? "none" : `transform ${current.seconds}s ease-in-out`,
          }}
        >
          <div className="text-center" aria-live="polite">
            {done ? (
              <>
                <Check className="mx-auto h-9 w-9 text-primary" />
                <p className="mt-2 font-display text-2xl font-semibold">完成了</p>
              </>
            ) : (
              <>
                <p className="font-display text-2xl font-semibold">{current.name}</p>
                <p className="mt-1 text-4xl font-light tabular-nums">{left}</p>
              </>
            )}
          </div>
        </div>
      </div>

      {done ? (
        <>
          <p className="mt-10 text-sm text-muted-foreground">
            你刚刚给了自己 {Math.round(elapsed / 60)} 分钟，完成了 {cycles} 轮呼吸。
          </p>
          <button
            onClick={close}
            className="mt-8 rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5"
          >
            好的
          </button>
        </>
      ) : (
        <>
          <p className="mt-10 text-sm text-muted-foreground">{plan.rhythm}</p>
          <p className="mt-2 text-sm text-muted-foreground tabular-nums">
            {remaining > 0 ? `还剩约 ${fmt(remaining)}` : "最后一轮"} · 已完成 {cycles} 轮
          </p>
          <button
            onClick={close}
            className="mt-8 rounded-full border border-border px-6 py-2.5 text-sm transition-colors hover:bg-secondary"
          >
            先到这里
          </button>
        </>
      )}
    </div>
  );
}
