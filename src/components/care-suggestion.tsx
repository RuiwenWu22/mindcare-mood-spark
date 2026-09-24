import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Phone } from "lucide-react";
import type { CareAction, CareRecommendation } from "@/lib/care-recs";
import { HOTLINE } from "@/lib/safety";
import { cn } from "@/lib/utils";

/**
 * 「🌿 此刻更适合你」：一个主要行动 + 换一种方式 + 暂时不需要。
 * 页面上唯一的实心按钮就是"开始"。
 */
export function CareSuggestion({
  rec,
  elevated,
  onStart,
  onRest,
  onMore,
}: {
  rec: CareRecommendation;
  elevated?: boolean;
  onStart: (a: CareAction) => void;
  onRest: () => void;
  /** 点"更多方式"时（例如先关掉弹层再跳转） */
  onMore?: () => void;
}) {
  const [current, setCurrent] = useState<CareAction>(rec.primary);
  const [others, setOthers] = useState(false);
  const isPrimary = current.id === rec.primary.id;
  const options = [rec.primary, ...rec.alternatives].filter((a) => a.id !== current.id);

  return (
    <section className="card-soft px-4 py-5 sm:px-5" aria-label="此刻更适合你">
      <p className="text-sm font-medium text-foreground/80">🌿 此刻更适合你</p>
      <p className="mt-3 flex items-center gap-2 font-display text-xl font-semibold">
        <span aria-hidden>{current.emoji}</span>
        {current.title}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">{isPrimary ? rec.reason : current.desc + "。"}</p>

      <button
        onClick={() => onStart(current)}
        className="mt-5 w-full rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5"
      >
        开始 {current.minutes} 分钟
      </button>
      <div className="mt-2.5 flex items-center justify-between gap-3">
        <button
          onClick={() => setOthers((v) => !v)}
          aria-expanded={others}
          className="rounded-full border border-border px-4 py-2 text-sm transition-colors hover:bg-secondary"
        >
          换一种方式
        </button>
        <button onClick={onRest} className="px-1 py-2 text-sm text-muted-foreground underline-offset-4 hover:underline">
          暂时不需要
        </button>
      </div>

      {others && (
        <ul className="animate-rise mt-3 space-y-2">
          {options.map((a) => (
            <li key={a.id}>
              <button
                onClick={() => {
                  setCurrent(a);
                  setOthers(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border border-border px-4 py-3 text-left transition-colors hover:bg-secondary",
                )}
              >
                <span className="text-xl" aria-hidden>
                  {a.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{a.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{a.desc}</span>
                </span>
              </button>
            </li>
          ))}
          <li className="pt-1 text-right">
            <Link to="/care" onClick={onMore} className="text-xs text-muted-foreground underline underline-offset-4">
              想换一种方式？看看全部 →
            </Link>
          </li>
        </ul>
      )}

      {elevated && (
        <p className="mt-4 flex gap-1.5 text-xs leading-relaxed text-muted-foreground">
          <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            这次的感受很强烈。如果它持续很久，或者让你难以承受，可以拨打
            <a href={`tel:${HOTLINE.number}`} className="mx-1 font-medium text-foreground underline underline-offset-2">
              {HOTLINE.number}
            </a>
            {HOTLINE.name}。
          </span>
        </p>
      )}
    </section>
  );
}
