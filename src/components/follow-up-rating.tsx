import { cn } from "@/lib/utils";

/** 调节之后的一次性再评分：点一下就完成，也可以跳过 */
export function FollowUpRating({
  moodLabel,
  before,
  onSubmit,
  onSkip,
}: {
  moodLabel: string;
  before: number;
  onSubmit: (after: number) => void;
  onSkip: () => void;
}) {
  return (
    <div className="animate-rise mt-8 rounded-3xl border border-border bg-card px-5 py-6 sm:px-6">
      <h3 className="font-display text-lg font-semibold">练完之后，现在感觉怎么样？</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">
        此刻的「{moodLabel}」有多强烈？刚才是 {before} / 10。
      </p>
      <div className="mt-5 grid grid-cols-10 gap-1.5" role="group" aria-label="现在的情绪强度">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => onSubmit(n)}
            aria-label={`${n} 分`}
            className={cn(
              "aspect-square rounded-xl border text-sm tabular-nums transition-colors hover:bg-primary-soft",
              n === before ? "border-primary font-medium" : "border-border",
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
        <span>很轻微</span>
        <span>非常强烈</span>
      </div>
      <button
        onClick={onSkip}
        className="mt-4 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        先跳过
      </button>
    </div>
  );
}
