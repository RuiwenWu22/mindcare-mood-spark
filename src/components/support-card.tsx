import { Phone, Wind } from "lucide-react";
import { HOTLINE } from "@/lib/safety";

/**
 * 记录里出现伤害自己的信号时，替换普通推荐显示。
 * 语气保持温和：不拦截、不说教、不制造恐慌，只把求助路径放到最近的位置。
 */
export function SupportCard({
  onBreathe,
  showingOthers,
  onToggleOthers,
}: {
  onBreathe: () => void;
  showingOthers: boolean;
  onToggleOthers: () => void;
}) {
  return (
    <div
      role="region"
      aria-label="支持与求助"
      className="animate-rise mt-8 rounded-3xl border border-border bg-accent-soft/70 px-5 py-6 sm:px-6"
    >
      <h3 className="font-display text-lg font-semibold">谢谢你愿意把这些写下来</h3>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">
        听起来你现在真的很难受。这些感受很重要，你不需要一个人扛着。MindCare
        只是自我关怀的小工具，没办法替代专业的帮助。
      </p>
      <p className="mt-3 text-sm leading-relaxed text-foreground/85">
        如果你有伤害自己的念头，请现在联系一个你信任的人，或者和专业的心理援助人员聊一聊：
      </p>

      <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
        <a
          href={`tel:${HOTLINE.number}`}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5"
        >
          <Phone className="h-4 w-4" />
          拨打 {HOTLINE.number} {HOTLINE.name}
        </a>
        <button
          onClick={onBreathe}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-medium transition-colors hover:bg-secondary"
        >
          <Wind className="h-4 w-4" />
          先跟着做 2 分钟慢呼吸
        </button>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        如果正处在紧急危险中，请立即拨打
        <a href="tel:120" className="mx-1 font-medium text-foreground underline underline-offset-2">
          120
        </a>
        或
        <a href="tel:110" className="mx-1 font-medium text-foreground underline underline-offset-2">
          110
        </a>
        。
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-4 text-xs text-muted-foreground">
        <span>你的记录已经保存。</span>
        <button onClick={onToggleOthers} className="underline underline-offset-4 hover:text-foreground">
          {showingOthers ? "收起其他方式" : "看看其他自我照顾的方式"}
        </button>
      </div>
    </div>
  );
}
