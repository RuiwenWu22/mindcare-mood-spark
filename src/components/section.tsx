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

export function ValenceBar({
  bright,
  neutral,
  heavy,
  className,
}: {
  bright: number;
  neutral: number;
  heavy: number;
  className?: string;
}) {
  const total = bright + neutral + heavy;
  return (
    <div
      className={cn("flex h-2.5 overflow-hidden rounded-full bg-secondary", className)}
      title={`舒展 ${bright} · 一般 ${neutral} · 偏消耗 ${heavy}`}
    >
      {total > 0 && (
        <>
          <span style={{ width: `${(bright / total) * 100}%`, backgroundColor: VALENCE_COLORS.bright }} />
          <span style={{ width: `${(neutral / total) * 100}%`, backgroundColor: VALENCE_COLORS.neutral }} />
          <span style={{ width: `${(heavy / total) * 100}%`, backgroundColor: VALENCE_COLORS.heavy }} />
        </>
      )}
    </div>
  );
}

export function ValenceLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground", className)}>
      {(
        [
          ["舒展", VALENCE_COLORS.bright],
          ["一般", VALENCE_COLORS.neutral],
          ["偏消耗", VALENCE_COLORS.heavy],
        ] as const
      ).map(([label, color]) => (
        <span key={label} className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
          {label}
        </span>
      ))}
    </div>
  );
}

/** 数据还没读出来时的灰色占位 */
export function Placeholder({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-xl bg-foreground/[0.06]", className)} />;
}
