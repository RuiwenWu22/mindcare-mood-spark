import { useState, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { AiCard } from "@/components/ai-card";
import { IntensityPicker } from "@/components/intensity-picker";
import { DESIRES, URGE_TRIGGERS, type Desire, type UrgeTrigger } from "@/lib/recovery";
import { afterPauseText, pauseCard, recoveryInsight } from "@/lib/recovery-ai";
import { recoveryDemo } from "@/lib/demo";
import { cn } from "@/lib/utils";

/** 示例里的一次"很想联系 TA"：和验收路径一致 */
const EX = {
  urge: 5,
  triggers: ["night_alone"] as UrgeTrigger[],
  text: "我很想问 TA，是不是已经完全不在乎我了。",
  desire: "still_care" as Desire,
  after: 3,
  reminder: "每次冷战以后我都很累。",
};

const chip = (on: boolean) =>
  cn("rounded-full border px-3 py-1.5 text-sm", on ? "border-primary/70 bg-primary-soft font-medium" : "border-border text-muted-foreground");

/**
 * 失恋恢复模式的示例：用一个固定的例子，把「我现在很想联系 TA」一步步走一遍。
 * 每一步都说明为什么这样做。只是展示，不会保存任何内容。
 */
export function RecoveryDemo({ onClose, onStart }: { onClose: () => void; onStart?: () => void }) {
  const [i, setI] = useState(0);
  const card = pauseCard({ urge: EX.urge, triggers: EX.triggers, text: EX.text, desire: EX.desire });
  const insight = recoveryInsight(recoveryDemo().urges);

  const slides: { title: string; why: string; body: ReactNode }[] = [
    {
      title: "现在有多想联系 TA？",
      why: "先给这股冲动打个分。之后再评一次，就能看到停一下有没有帮助。",
      body: <IntensityPicker value={EX.urge} onChange={() => {}} label="示例：联系冲动" low="有一点想" high="非常想" />,
    },
    {
      title: "刚刚发生了什么？",
      why: "看清是什么勾起了这股冲动。记录几次后，会发现哪些时刻最容易触发。",
      body: (
        <div className="flex flex-wrap gap-2">
          {URGE_TRIGGERS.slice(0, 6).map((t) => (
            <span key={t.key} className={chip(EX.triggers.includes(t.key))}>
              {t.label}
            </span>
          ))}
        </div>
      ),
    },
    {
      title: "你现在最想对 TA 说什么？",
      why: "想说的话先写在这里，不需要马上决定要不要发送。",
      body: (
        <>
          <p className="rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-[15px] leading-relaxed">{EX.text}</p>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> 这段内容不会被发送给任何人。
          </p>
        </>
      ),
    },
    {
      title: "如果 TA 回复了，你最希望得到什么？",
      why: "分清“想说的话”和“真正想要的东西”，是停下来的关键一步。",
      body: (
        <div className="grid gap-2">
          {DESIRES.slice(0, 5).map((d) => (
            <span key={d.key} className={cn(chip(d.key === EX.desire), "rounded-2xl")}>
              {d.label}
            </span>
          ))}
        </div>
      ),
    },
    {
      title: "看清自己真正需要什么",
      why: "它只说你自己的需要，不判断 TA，也不替你决定。三个选择都可以，包括联系。",
      body: (
        <>
          <AiCard title="先帮你停一下">
            <div className="space-y-1.5 text-[15px] leading-relaxed">
              {card.lines.map((l) => (
                <p key={l}>{l}</p>
              ))}
            </div>
          </AiCard>
          <div className="mt-3 space-y-2 text-center text-sm">
            <p className="rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground">先保存，不发送</p>
            <p className="rounded-full border border-border px-6 py-2.5">10 分钟后再决定</p>
            <p className="py-1 text-muted-foreground">我还是决定联系</p>
          </div>
        </>
      ),
    },
    {
      title: "先停一分钟",
      why: "不锁定页面，也不用解决任何事。冲动很强时，会看到你之前写给自己的提醒。",
      body: (
        <div className="text-center">
          <div className="mx-auto flex h-32 w-32 items-center justify-center">
            <div className="animate-pause-breathe h-32 w-32 rounded-full bg-primary-soft" />
          </div>
          <p className="mt-3 text-sm">暂时不用解决任何事情，先让这一分钟过去。</p>
          <div className="mt-4 rounded-2xl bg-secondary/60 px-4 py-3 text-left text-sm">
            <p className="text-xs text-muted-foreground">你之前留给自己的提醒</p>
            <p className="mt-1">“{EX.reminder}”</p>
          </div>
        </div>
      ),
    },
    {
      title: "现在还想联系 TA 吗？",
      why: "再评一次分。降下来说明停一下有帮助；没降也没关系，继续记录就好。",
      body: (
        <div className="text-center">
          <p className="font-display text-4xl font-semibold tabular-nums">
            {EX.urge} → {EX.after}
          </p>
          <p className="mt-2 text-sm">{afterPauseText(EX.urge, EX.after)}</p>
        </div>
      ),
    },
    {
      title: "几次之后，会看到自己的规律",
      why: "洞察里的「最近的恢复轨迹」会统计冲动次数、强度、停一下前后的变化和常见的触发时刻。",
      body: (
        <AiCard title="AI 发现">
          <div className="space-y-1.5 text-[15px] leading-relaxed">
            {insight.lines.map((l) => (
              <p key={l}>{l}</p>
            ))}
          </div>
        </AiCard>
      ),
    },
  ];

  const s = slides[i]!;
  const last = i === slides.length - 1;
  return (
    <div className="pb-1">
      <div className="flex items-center gap-2 pr-10">
        <span className="rounded-full border border-dashed border-primary/60 px-2.5 py-0.5 text-xs">示例 · 不会保存</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {i + 1} / {slides.length}
        </span>
      </div>
      <div className="mt-2 flex gap-1" aria-hidden>
        {slides.map((_, k) => (
          <span key={k} className={cn("h-1 flex-1 rounded-full", k <= i ? "bg-primary/70" : "bg-secondary")} />
        ))}
      </div>

      <div key={i} className="animate-rise mt-5" aria-live="polite">
        <h2 className="font-display text-xl font-semibold">{s.title}</h2>
        <div inert className="mt-4 select-none">
          {s.body}
        </div>
        <p className="mt-5 rounded-2xl bg-sand/50 px-4 py-3 text-sm leading-relaxed text-foreground/85">💡 {s.why}</p>
      </div>

      <div className="mt-6 flex items-center gap-2">
        {i > 0 && (
          <button onClick={() => setI(i - 1)} className="rounded-full border border-border px-5 py-3 text-sm transition-colors hover:bg-secondary">
            上一步
          </button>
        )}
        {!last ? (
          <button onClick={() => setI(i + 1)} className="flex-1 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">
            下一步
          </button>
        ) : onStart ? (
          <button onClick={onStart} className="flex-1 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">
            开启失恋恢复模式
          </button>
        ) : (
          <button onClick={onClose} className="flex-1 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">
            我知道了
          </button>
        )}
      </div>
      {!last && (
        <button onClick={onClose} className="mt-2 w-full py-2 text-xs text-muted-foreground underline-offset-4 hover:underline">
          跳过示例
        </button>
      )}
    </div>
  );
}
