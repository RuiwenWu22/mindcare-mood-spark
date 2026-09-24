import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useCycle } from "@/hooks/use-cycle";
import { useEntries } from "@/hooks/use-entries";
import {
  addStart,
  cycleStats,
  daysBetween,
  phaseFinding,
  phaseMoodStats,
  removePeriod,
  setEnd,
  type EditResult,
} from "@/lib/cycle";
import { dayKey } from "@/lib/mood";

const md = (d: string) => `${Number(d.slice(5, 7))} 月 ${Number(d.slice(8, 10))} 日`;

/** 周期记录：可选模块，默认关闭。放在洞察页，靠近「身体和情绪」 */
export function CycleCard() {
  const cycle = useCycle();
  const { entries } = useEntries();
  const [other, setOther] = useState(false);
  const [date, setDate] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const today = dayKey();
  const stats = useMemo(() => cycleStats(cycle.periods, today), [cycle.periods, today]);
  const buckets = useMemo(() => phaseMoodStats(entries, cycle.periods), [entries, cycle.periods]);
  const finding = useMemo(() => phaseFinding(entries, cycle.periods, today), [entries, cycle.periods, today]);

  if (!cycle.ready) return null;

  const shell = "card-soft px-5 py-6 sm:px-7";
  const btn = "rounded-full border border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-secondary";

  if (!cycle.enabled) {
    return (
      <section className={shell} aria-label="周期记录">
        <h2 className="font-display text-lg font-semibold">
          周期记录 <span className="ml-1 align-middle text-xs font-normal text-muted-foreground">可选</span>
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          如果你有生理周期，可以记下每次的开始和结束日期，看看情绪和周期有没有关系。只存在这台设备上，可以随时单独删除，导出时默认不包含。
        </p>
        <button onClick={cycle.enable} className={`mt-4 ${btn}`}>
          开启周期记录
        </button>
      </section>
    );
  }

  const apply = (r: EditResult, ok: string) => {
    if (r.ok) {
      cycle.setPeriods(r.periods);
      setMsg(ok);
      setOther(false);
      setDate("");
    } else {
      setMsg(r.error);
    }
  };

  const sorted = [...cycle.periods].sort((a, b) => b.start.localeCompare(a.start));
  const open = sorted.find((p) => !p.end && daysBetween(p.start, today) <= 14);

  return (
    <section className={shell} aria-label="周期记录">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">周期记录</h2>
        <span className="text-xs text-muted-foreground">只存本机 · 导出时默认不包含</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {open ? (
          <button onClick={() => apply(setEnd(cycle.periods, today, today), "记下了：今天结束。")} className={btn}>
            今天结束了
          </button>
        ) : (
          <button onClick={() => apply(addStart(cycle.periods, today, today), "记下了：今天开始。")} className={btn}>
            今天开始了
          </button>
        )}
        <button
          onClick={() => setOther((v) => !v)}
          aria-expanded={other}
          className="px-2 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          记在其他日期
        </button>
      </div>
      {other && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-secondary/40 px-4 py-3">
          <input
            type="date"
            aria-label="日期"
            max={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-border bg-card px-2 py-1 text-sm"
          />
          <button
            disabled={!date}
            onClick={() => apply(addStart(cycle.periods, date, today), `记下了：${md(date)} 开始。`)}
            className="rounded-full border border-border bg-card px-3 py-1 text-xs hover:bg-secondary disabled:opacity-50"
          >
            记为开始
          </button>
          <button
            disabled={!date}
            onClick={() => apply(setEnd(cycle.periods, date, today), `记下了：${md(date)} 结束。`)}
            className="rounded-full border border-border bg-card px-3 py-1 text-xs hover:bg-secondary disabled:opacity-50"
          >
            记为结束
          </button>
        </div>
      )}
      {msg && (
        <p className="mt-2 text-xs text-muted-foreground" role="status">
          {msg}
        </p>
      )}

      {/* ---------- 你的规律 ---------- */}
      <div className="mt-5 text-sm leading-relaxed">
        {!stats.ready ? (
          <p className="text-muted-foreground">
            {cycle.periods.length === 0
              ? "记下第一次开始日期吧。"
              : `已记录 ${stats.cycles} 个完整周期。再记录 ${stats.need} 个周期后，这里会提示你自己的规律。`}
          </p>
        ) : (
          <>
            <p>
              最近 {Math.min(stats.cycles, 6)} 个周期平均 <span className="font-medium">{stats.avg} 天</span>
              （最短 {stats.min} 天，最长 {stats.max} 天）
              {stats.avgDays !== undefined ? `，经期平均 ${stats.avgDays} 天` : ""}。
            </p>
            {stats.next && (
              <p className="mt-1 text-foreground/80">按平均周期推算，下次大约在 {md(stats.next)}。只是估算，不是预测。</p>
            )}
            {stats.skipped > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                有 {stats.skipped} 段间隔超过 60 天，可能中间漏记了，没有算进来。
              </p>
            )}
            {stats.concerns.length > 0 && (
              <div className="mt-3 rounded-2xl border border-amber-300/60 bg-amber-50/60 px-4 py-3 text-foreground/85 dark:bg-amber-950/20">
                <ul className="space-y-1">
                  {stats.concerns.map((c) => (
                    <li key={c}>· {c}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs leading-relaxed">
                  周期受压力、作息和饮食影响，偶尔波动很常见。如果持续这样，或者伴随明显疼痛、出血量异常，建议到医院妇科看看。
                </p>
              </div>
            )}

            <h3 className="mt-5 text-sm font-medium">周期和情绪</h3>
            <ul className="mt-3 space-y-3">
              {buckets.map((b) => (
                <li key={b.key}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span>
                      {b.emoji} {b.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{b.records} 条记录</span>
                  </div>
                  <div
                    className="mt-1.5 flex h-2.5 overflow-hidden rounded-full bg-secondary"
                    title={`舒展 ${b.bright} · 一般 ${b.records - b.bright - b.heavy} · 偏消耗 ${b.heavy}`}
                  >
                    {b.records > 0 && (
                      <>
                        <span style={{ width: `${(b.bright / b.records) * 100}%`, backgroundColor: "var(--mood-calm)" }} />
                        <span
                          style={{
                            width: `${((b.records - b.bright - b.heavy) / b.records) * 100}%`,
                            backgroundColor: "var(--mood-neutral)",
                          }}
                        />
                        <span style={{ width: `${(b.heavy / b.records) * 100}%`, backgroundColor: "var(--mood-anxious)" }} />
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-foreground/85">
              {finding
                ? finding.sentence
                : buckets.reduce((n, b) => n + b.records, 0) < 6
                  ? "这些日子里的情绪记录还不多，多记几天再来看看。"
                  : "目前看不出情绪和周期有明显关系。记录越多，这里越准确。"}
            </p>
            {finding && <p className="mt-1 text-xs text-muted-foreground">{finding.evidence}</p>}
          </>
        )}
      </div>

      {/* ---------- 记录列表 ---------- */}
      {sorted.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2">
          {sorted.slice(0, 8).map((p) => (
            <li key={p.start} className="flex items-center gap-1 rounded-full bg-secondary/60 py-1 pl-3 pr-1 text-xs">
              {md(p.start)}
              {p.end ? ` – ${md(p.end)}（${daysBetween(p.start, p.end) + 1} 天）` : " 开始"}
              <button
                onClick={() => cycle.setPeriods(removePeriod(cycle.periods, p.start))}
                aria-label={`删除 ${md(p.start)} 的记录`}
                className="rounded-full p-1 text-muted-foreground hover:bg-card hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 border-t border-border/70 pt-4 text-xs text-muted-foreground">
        {!confirming ? (
          <button onClick={() => setConfirming(true)} className="underline-offset-4 hover:underline">
            关闭并删除全部周期记录
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2" role="alertdialog">
            <span className="text-foreground">确定删除 {cycle.periods.length} 条周期记录并关闭吗？情绪记录不受影响。</span>
            <button
              onClick={() => {
                cycle.disable();
                setConfirming(false);
                setMsg(null);
              }}
              className="rounded-full bg-destructive px-3 py-1 text-destructive-foreground"
            >
              确认删除
            </button>
            <button onClick={() => setConfirming(false)} className="rounded-full border border-border px-3 py-1">
              取消
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
