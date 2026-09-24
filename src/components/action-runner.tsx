import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { BreathingSession, type BreathingResult } from "@/components/breathing-session";
import { BREATHING_PLANS, type CareAction, type Step } from "@/lib/care-recs";
import { AMBIENT_TRACKS, playAmbient, stopAmbient } from "@/lib/ambient";
import { useAmbient } from "@/hooks/use-ambient";
import { toast } from "sonner";

export type RunResult = BreathingResult;

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.max(0, sec) % 60).padStart(2, "0")}`;

/** 全屏的练习界面：呼吸、按步骤的轻运动 / 睡前放松、背景声 */
export function ActionRunner({ action, onClose }: { action: CareAction; onClose: (r: RunResult) => void }) {
  if (action.kind === "breathing" && action.plan) {
    return <BreathingSession plan={BREATHING_PLANS[action.plan]} targetSeconds={action.minutes * 60} onClose={onClose} />;
  }
  if (action.kind === "ambient" && action.ambient) return <AmbientSession action={action} onClose={onClose} />;
  return <StepSession action={action} steps={action.steps ?? []} onClose={onClose} />;
}

function Shell({ title, onExit, children }: { title: string; onExit: () => void; children: React.ReactNode }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-background/95 px-6 text-center backdrop-blur-xl"
    >
      <button
        onClick={onExit}
        aria-label="结束"
        className="absolute right-5 top-5 rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary"
      >
        <X className="h-5 w-5" />
      </button>
      <p className="mb-8 font-display text-lg font-semibold">{title}</p>
      {children}
    </div>
  );
}

function Done({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <>
      <div className="flex h-56 w-56 items-center justify-center rounded-full bg-primary-soft">
        <div>
          <Check className="mx-auto h-9 w-9 text-primary" />
          <p className="mt-2 font-display text-2xl font-semibold">完成了</p>
        </div>
      </div>
      <p className="mt-10 text-sm text-muted-foreground">{text}</p>
      <button
        onClick={onClose}
        className="mt-8 rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)]"
      >
        好的
      </button>
    </>
  );
}

/** 按步骤计时：肩颈伸展、散步、睡前放松 */
function StepSession({ action, steps, onClose }: { action: CareAction; steps: Step[]; onClose: (r: RunResult) => void }) {
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(steps[0]?.seconds ?? 0);
  const [done, setDone] = useState(steps.length === 0);
  const elapsed = useRef(0);

  useEffect(() => {
    if (done) return;
    const id = window.setInterval(() => {
      elapsed.current += 1;
      setLeft((l) => l - 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [done]);

  useEffect(() => {
    if (done || left > 0) return;
    if (i + 1 >= steps.length) setDone(true);
    else {
      setI(i + 1);
      setLeft(steps[i + 1]!.seconds);
    }
  }, [left, i, steps, done]);

  const close = () => onClose({ elapsed: elapsed.current, completed: done });
  const step = steps[i];

  return (
    <Shell title={action.title} onExit={close}>
      {done ? (
        <Done text={`你刚刚给了自己 ${Math.max(1, Math.round(elapsed.current / 60))} 分钟。`} onClose={close} />
      ) : (
        <>
          <div className="flex h-56 w-56 flex-col items-center justify-center rounded-full bg-primary-soft px-6">
            <p className="text-xs text-muted-foreground">
              第 {i + 1} / {steps.length} 步
            </p>
            <p className="mt-2 font-display text-xl font-semibold leading-snug">{step?.title}</p>
            <p className="mt-2 text-3xl font-light tabular-nums" aria-live="polite">
              {fmt(left)}
            </p>
          </div>
          {step?.hint && <p className="mt-10 max-w-xs text-sm text-muted-foreground">{step.hint}</p>}
          <div className="mt-8 flex gap-2">
            {i + 1 < steps.length && (
              <button
                onClick={() => setLeft(0)}
                className="rounded-full border border-border px-5 py-2.5 text-sm transition-colors hover:bg-secondary"
              >
                下一步
              </button>
            )}
            <button
              onClick={close}
              className="rounded-full border border-border px-5 py-2.5 text-sm transition-colors hover:bg-secondary"
            >
              先到这里
            </button>
          </div>
        </>
      )}
    </Shell>
  );
}

/** 背景声：开始播放并倒计时，到时间自动淡出 */
function AmbientSession({ action, onClose }: { action: CareAction; onClose: (r: RunResult) => void }) {
  const { playing, endsAt } = useAmbient();
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const startedAt = useRef(Date.now());
  const track = AMBIENT_TRACKS[action.ambient!];

  useEffect(() => {
    const ok = playAmbient(action.ambient!, action.minutes);
    if (!ok) {
      toast("当前浏览器暂不支持播放背景声");
      onClose({ elapsed: 0, completed: false });
      return;
    }
    startedAt.current = Date.now();
    setStarted(true);
    // 只在打开时开始播放一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // 播放到时间后自动淡出，这时算作完成
  useEffect(() => {
    if (started && !playing && !done) setDone(true);
  }, [started, playing, done]);

  const elapsed = () => Math.round((Date.now() - startedAt.current) / 1000);
  const close = () => {
    const completed = done;
    if (!done) stopAmbient();
    onClose({ elapsed: elapsed(), completed });
  };
  const left = endsAt ? Math.round((endsAt - now) / 1000) : action.minutes * 60;

  return (
    <Shell title={action.title} onExit={close}>
      {done ? (
        <Done text={`你刚刚听了 ${Math.max(1, Math.round(elapsed() / 60))} 分钟。`} onClose={close} />
      ) : (
        <>
          <div className="flex h-56 w-56 animate-pulse items-center justify-center rounded-full bg-primary-soft [animation-duration:4s]">
            <div>
              <p className="text-5xl">{track.emoji}</p>
              <p className="mt-3 text-3xl font-light tabular-nums" aria-live="off">
                {fmt(left)}
              </p>
            </div>
          </div>
          <p className="mt-10 max-w-xs text-sm text-muted-foreground">{action.desc}。闭上眼睛也可以，到时间会自动淡出。</p>
          <button
            onClick={close}
            className="mt-8 rounded-full border border-border px-6 py-2.5 text-sm transition-colors hover:bg-secondary"
          >
            先到这里
          </button>
        </>
      )}
    </Shell>
  );
}
