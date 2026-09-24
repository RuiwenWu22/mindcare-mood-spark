import { useState } from "react";
import { Phone } from "lucide-react";
import { IntensityPicker } from "@/components/intensity-picker";
import { HOTLINE } from "@/lib/safety";

/**
 * 调节完成后的反馈：「感觉有变化吗？」
 * 选完分数立即保存（改选会更新同一条），再给一句温和的回应。
 */
export function FeedbackStep({
  moodLabel,
  before,
  negative,
  actionTitle,
  onPick,
  onDone,
}: {
  moodLabel: string;
  before: number;
  /** 这条记录是不是负面情绪：正向情绪的强度下降不代表"变好" */
  negative: boolean;
  actionTitle: string;
  onPick: (after: number) => void;
  onDone: () => void;
}) {
  const [after, setAfter] = useState<number | null>(null);

  let message = "";
  if (after !== null) {
    if (!negative) message = after >= before ? "看起来好状态还在。" : "心情有了一些变化，可以留意一下是什么带来的。";
    else if (after < before) message = "看起来现在比刚才轻松了一些。";
    else if (after === before) message = "变化不大也没关系，愿意停下来照顾自己，已经很好了。";
    else message = "好像更难受了一点。可以换一种方式试试，或者先好好休息。";
  }

  return (
    <div className="animate-rise">
      <h2 className="font-display text-xl font-semibold">感觉有变化吗？</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        刚刚做了「{actionTitle}」。调节前：{moodLabel} {before} / 5
      </p>
      <p className="mt-5 text-sm font-medium">现在的「{moodLabel}」有多强烈？</p>
      <div className="mt-3">
        <IntensityPicker
          value={after}
          highlight={before}
          label="现在的强度"
          onChange={(n) => {
            setAfter(n);
            onPick(n);
          }}
        />
      </div>

      {after !== null && (
        <div className="animate-rise mt-6 text-center">
          <p className="font-display text-4xl font-semibold tabular-nums">
            {before} → {after}
          </p>
          <p className="mt-2 text-sm text-foreground/85">{message}</p>
          {negative && after >= 5 && (
            <p className="mt-3 flex items-start justify-center gap-1.5 text-xs leading-relaxed text-muted-foreground">
              <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                如果这种感受一直很强烈，可以拨打
                <a href={`tel:${HOTLINE.number}`} className="mx-1 font-medium text-foreground underline underline-offset-2">
                  {HOTLINE.number}
                </a>
                {HOTLINE.name}。
              </span>
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">已记下，会出现在洞察的「什么对我有效」里。</p>
          <button
            onClick={onDone}
            className="mt-5 w-full rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)]"
          >
            完成
          </button>
        </div>
      )}
    </div>
  );
}
