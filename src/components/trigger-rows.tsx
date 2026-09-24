import type { TriggerStat } from "@/lib/insights";

/** 任何一个原因超过这么多次时，整组改用按次数缩放的长条 */
export const TRIGGER_DOT_LIMIT = 10;

/**
 * 常见的触发因素：按次数从高到低。
 * - 次数少：一个色块代表一次记录，颜色是当时的情绪，色块的多少就是次数
 * - 次数多（有原因 ≥ 10 次）：长条长度按次数缩放（最多的为 100%），条内颜色是情绪构成
 * 图例只列出实际出现过的情绪。
 */
export function TriggerRows({ stats, onSelect }: { stats: TriggerStat[]; onSelect?: (key: string) => void }) {
  const max = Math.max(1, ...stats.map((s) => s.count));
  const dots = max < TRIGGER_DOT_LIMIT;
  const legend = new Map<string, TriggerStat["moods"][number]["mood"]>();
  stats.forEach((s) => s.moods.forEach((m) => legend.set(m.mood.key, m.mood)));
  const order = ["happy", "calm", "okay", "neutral", "anxious", "sad", "irritated", "stressed"];

  return (
    <div>
      <ul className="space-y-4">
        {stats.map((s) => {
          const summary = s.moods.map((m) => `${m.mood.label} ${m.count}`).join(" · ");
          return (
            <li key={s.key}>
              {onSelect ? (
                <button
                  onClick={() => onSelect(s.key)}
                  aria-label={`查看「${s.label}」细分`}
                  className="flex w-full items-baseline justify-between gap-3 text-left text-sm hover:text-foreground/80"
                >
                  <span className="font-medium">{s.label}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{s.count} 次 · 细分 ›</span>
                </button>
              ) : (
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{s.label}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{s.count} 次</span>
                </div>
              )}
              {dots ? (
                <div className="mt-2 flex flex-wrap gap-1" role="img" aria-label={`${s.label} ${s.count} 次：${summary}`}>
                  {s.moods.flatMap((m) =>
                    Array.from({ length: m.count }, (_, i) => (
                      <span
                        key={`${m.mood.key}-${i}`}
                        className="h-4 w-4 rounded-full sm:h-[18px] sm:w-[18px]"
                        style={{ backgroundColor: m.mood.color }}
                      />
                    )),
                  )}
                </div>
              ) : (
                <div className="mt-2 h-2.5 rounded-full bg-secondary/60" role="img" aria-label={`${s.label} ${s.count} 次：${summary}`}>
                  <div className="flex h-full overflow-hidden rounded-full" style={{ width: `${(s.count / max) * 100}%` }}>
                    {s.moods.map((m) => (
                      <span key={m.mood.key} style={{ width: `${(m.count / s.count) * 100}%`, backgroundColor: m.mood.color }} />
                    ))}
                  </div>
                </div>
              )}
              <p className="mt-1.5 text-xs text-muted-foreground" aria-hidden>
                {summary}
              </p>
            </li>
          );
        })}
      </ul>
      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border/70 pt-3 text-xs text-muted-foreground">
        {[...legend.values()]
          .sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key))
          .map((m) => (
            <span key={m.key} className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: m.color }} />
              {m.emoji} {m.label}
            </span>
          ))}
      </div>
    </div>
  );
}
