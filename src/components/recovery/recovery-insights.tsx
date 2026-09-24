import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AiCard, WhyToggle } from "@/components/ai-card";
import { SectionCard, Segmented } from "@/components/section";
import { useRecovery } from "@/hooks/use-recovery";
import { recoveryInsight, recoveryTrack } from "@/lib/recovery-ai";

type Range = "7" | "14" | "30";
const RANGES: { key: Range; label: string }[] = [
  { key: "7", label: "7 天" },
  { key: "14", label: "14 天" },
  { key: "30", label: "30 天" },
];

/** 洞察页：最近的恢复轨迹。只在开启失恋恢复模式后显示 */
export function RecoveryInsights({ now }: { now: Date }) {
  const r = useRecovery();
  const [range, setRange] = useState<Range>("7");
  const ref = useRef<HTMLDivElement>(null);
  const track = useMemo(
    () => recoveryTrack(r.urges, Number(range), r.profile?.enabled_at, now),
    [r.urges, range, r.profile?.enabled_at, now],
  );
  const insight = useMemo(() => recoveryInsight(r.urges, now), [r.urges, now]);

  // 从今天页"查看恢复轨迹"进来时，滚到这里
  useEffect(() => {
    if (r.enabled && window.location.hash === "#recovery") ref.current?.scrollIntoView({ block: "start" });
  }, [r.enabled]);

  if (!r.ready || !r.enabled) return null;
  const counts = track.windows.map((w) => w.count);
  const avgs = track.windows.map((w) => (w.avgUrge === null ? "—" : String(w.avgUrge)));

  return (
    <div ref={ref} id="recovery" className="scroll-mt-24">
      <SectionCard
        title="最近的恢复轨迹"
        desc="只统计你在失恋恢复模式里的记录。"
        action={<Segmented items={RANGES} value={range} onChange={setRange} label="时间范围" className="w-full sm:w-56" />}
      >
        <AiCard title="AI 发现">
          {insight.lines.length ? (
            <div className="space-y-1.5 text-[15px] leading-relaxed">
              {insight.lines.map((l) => (
                <p key={l}>{l}</p>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-relaxed">再记录几次后，我会慢慢帮助你发现哪些时刻最容易触发这种冲动。</p>
          )}
          <WhyToggle items={insight.evidence} />
        </AiCard>

        <dl className="mt-5 grid gap-2.5 sm:grid-cols-3">
          <div className="rounded-2xl bg-secondary/50 px-4 py-3.5">
            <dt className="text-xs text-muted-foreground">联系冲动次数</dt>
            <dd className="mt-1 font-display text-2xl font-medium tabular-nums">{counts.join(" → ")}</dd>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{track.windows.map((w) => w.label).join(" → ")}</p>
          </div>
          <div className="rounded-2xl bg-secondary/50 px-4 py-3.5">
            <dt className="text-xs text-muted-foreground">平均冲动强度</dt>
            <dd className="mt-1 font-display text-2xl font-medium tabular-nums">{avgs.join(" → ")}</dd>
            <p className="mt-0.5 text-[11px] text-muted-foreground">1 = 有一点想，5 = 非常想</p>
          </div>
          <div className="rounded-2xl bg-secondary/50 px-4 py-3.5">
            <dt className="text-xs text-muted-foreground">停一下之后的平均变化</dt>
            <dd className="mt-1 font-display text-2xl font-medium tabular-nums">
              {track.pause ? `${track.pause.before} → ${track.pause.after}` : "—"}
            </dd>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {track.pause ? `最近 ${range} 天里，停一下后再评分的 ${track.pause.count} 次` : "停一下之后再评一次分，这里会显示变化"}
            </p>
          </div>
        </dl>

        <div className="mt-5">
          <p className="text-sm font-medium">最常见的触发时刻</p>
          {track.topTriggers.length === 0 ? (
            <p className="mt-1.5 text-sm text-muted-foreground">最近 {range} 天还没有记录。</p>
          ) : (
            <ol className="mt-2 space-y-1.5 text-sm">
              {track.topTriggers.map((t, i) => (
                <li key={t.label} className="flex items-baseline justify-between gap-3">
                  <span>
                    <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                    {t.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{t.count} 次</span>
                </li>
              ))}
            </ol>
          )}
        </div>
        <Link to="/recovery" className="mt-5 inline-block text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
          去恢复空间看看没有发送的话 →
        </Link>
      </SectionCard>
    </div>
  );
}
