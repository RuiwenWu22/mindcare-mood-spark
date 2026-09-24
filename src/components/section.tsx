import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 统一的卡片区块：标题、说明、内容。所有页面的区块都用它，层级和间距保持一致 */
export function SectionCard({
  title,
  desc,
  action,
  children,
  className,
  id,
}: {
  title: ReactNode;
  desc?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("card-soft scroll-mt-24 px-5 py-6 sm:px-7", className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          {desc && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{desc}</p>}
        </div>
        {action}
      </div>
      {children && <div className="mt-5">{children}</div>}
    </section>
  );
}

/** 胶囊式标签切换。一次只看一类内容 */
export function Segmented<K extends string>({
  items,
  value,
  onChange,
  label,
  className,
}: {
  items: { key: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
  label: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("flex gap-1 overflow-x-auto rounded-full bg-secondary/80 p-1 [scrollbar-width:none]", className)}
    >
      {items.map((it) => {
        const active = it.key === value;
        return (
          <button
            key={it.key}
            role="tab"
            id={`${id}-${it.key}`}
            aria-selected={active}
            onClick={() => onChange(it.key)}
            className={cn(
              "shrink-0 flex-1 whitespace-nowrap rounded-full px-3.5 py-2 text-sm transition-all",
              active
                ? "bg-card font-medium text-foreground shadow-[var(--shadow-soft)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

/** 颜色的含义全站统一：绿 = 舒展，灰 = 一般，紫 = 偏消耗 */
export const VALENCE_COLORS = {
  bright: "var(--mood-calm)",
  neutral: "var(--mood-neutral)",
  heavy: "var(--mood-anxious)",
} as const;

const KINDS = [
  { key: "bright", label: "舒展" },
  { key: "neutral", label: "一般" },
  { key: "heavy", label: "偏消耗" },
] as const;

export type ValenceRow = { key: string; emoji?: string; label: string; bright: number; neutral: number; heavy: number };

/** 一组里最多有这么多条记录时，一条记录画一个色块；更多时才用百分比长条 */
export const BLOCK_LIMIT = 20;

const totalOf = (r: ValenceRow) => r.bright + r.neutral + r.heavy;

/**
 * 不同状态下的情绪构成。
 * - 记录少（整组每行都 ≤ 20 条）：一条记录一个色块，按 舒展 → 一般 → 偏消耗 排列
 * - 记录多：100% 长条，上方直接写百分比和次数
 * 每行都直接写出次数，不依赖底部图例；同一组里所有行用同一种画法，方便对比。
 */
export function ValenceRows({ rows, className }: { rows: ValenceRow[]; className?: string }) {
  const blocks = Math.max(0, ...rows.map(totalOf)) <= BLOCK_LIMIT;
  return (
    <ul className={cn("space-y-4", className)}>
      {rows.map((r) => {
        const n = totalOf(r);
        const parts = KINDS.map((k) => ({ ...k, count: r[k.key] })).filter((k) => k.count > 0);
        const summary = parts.map((k) => `${k.label} ${k.count} 次`).join("，");
        return (
          <li key={r.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">
                {r.emoji ? `${r.emoji} ` : ""}
                {r.label}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{n ? `${n} 次记录` : "还没有记录"}</span>
            </div>
            {n > 0 &&
              (blocks ? (
                <>
                  <div className="mt-2 flex flex-wrap gap-1" role="img" aria-label={`${n} 次记录：${summary}`}>
                    {parts.flatMap((k) =>
                      Array.from({ length: k.count }, (_, i) => (
                        <span
                          key={`${k.key}-${i}`}
                          className="h-4 w-4 rounded-[5px] sm:h-[18px] sm:w-[18px]"
                          style={{ backgroundColor: VALENCE_COLORS[k.key] }}
                        />
                      )),
                    )}
                  </div>
                  <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground" aria-hidden>
                    {parts.map((k) => (
                      <span key={k.key} className="flex items-center gap-1">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: VALENCE_COLORS[k.key] }} />
                        {k.label} {k.count} 次
                      </span>
                    ))}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {parts.map((k) => (
                      <span key={k.key} className="flex items-center gap-1">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: VALENCE_COLORS[k.key] }} />
                        {k.label} {Math.round((k.count / n) * 100)}%（{k.count} 次）
                      </span>
                    ))}
                  </p>
                  <div
                    className="mt-1.5 flex h-2.5 overflow-hidden rounded-full bg-secondary"
                    role="img"
                    aria-label={`${n} 次记录：${summary}`}
                  >
                    {parts.map((k) => (
                      <span key={k.key} style={{ width: `${(k.count / n) * 100}%`, backgroundColor: VALENCE_COLORS[k.key] }} />
                    ))}
                  </div>
                </>
              ))}
          </li>
        );
      })}
    </ul>
  );
}

/** 数据还没读出来时的灰色占位 */
export function Placeholder({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-xl bg-foreground/[0.06]", className)} />;
}
