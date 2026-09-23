import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { useEntries } from "@/hooks/use-entries";
import { SampleNotice } from "@/components/sample-notice";
import {
  analyzeEntries,
  entryScore,
  lastNDays,
  moodDistribution,
  moodOf,
  timeOfDayStats,
  triggerMoodBreakdown,
  triggerRanking,
} from "@/lib/mood";


export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "情绪洞察｜MindCare" },
      { name: "description", content: "看看最近 7 天的情绪趋势、高频情绪和可能的触发因素。" },
      { property: "og:title", content: "情绪洞察｜MindCare" },
      { property: "og:description", content: "看见自己最近的情绪变化。" },
    ],
  }),
  component: InsightsPage,
});

function TrendChart({ points }: { points: { label: string; score: number | null; emoji?: string }[] }) {
  const w = 700;
  const h = 200;
  const pad = 24;
  const step = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;
  const y = (s: number) => pad + (1 - s / 100) * (h - pad * 2);
  const coords = points.map((p, i) => ({ ...p, x: pad + i * step, y: p.score === null ? null : y(p.score) }));
  const filled = coords.filter((c) => c.y !== null) as { x: number; y: number; label: string; emoji?: string }[];
  const line = filled.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  const area =
    filled.length > 1
      ? `${line} L${filled[filled.length - 1]!.x},${h - pad} L${filled[0]!.x},${h - pad} Z`
      : "";

  return (
    <div className="mt-6">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-48 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 50, 100].map((v) => (
          <line
            key={v}
            x1={pad}
            x2={w - pad}
            y1={y(v)}
            y2={y(v)}
            stroke="var(--border)"
            strokeDasharray="4 6"
          />
        ))}
        {area && <path d={area} fill="url(#trendFill)" />}
        {filled.length > 1 && (
          <path d={line} fill="none" stroke="var(--primary)" strokeWidth={3} strokeLinecap="round" />
        )}
        {filled.map((c) => (
          <circle key={c.x} cx={c.x} cy={c.y} r={5} fill="var(--card)" stroke="var(--primary)" strokeWidth={3} />
        ))}
      </svg>
      <div className="mt-2 flex justify-between px-1 text-xs text-muted-foreground">
        {points.map((p) => (
          <span key={p.label} className="flex-1 text-center">
            <span className="block text-base">{p.emoji ?? "·"}</span>
            {p.label}
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        线条越高，代表当天记录里的感受越轻松；空缺表示那天没有记录。
      </p>
    </div>
  );
}

function InsightsPage() {
  const { entries, ready } = useEntries();

  const days = useMemo(() => lastNDays(entries, 7), [entries]);
  const points = days.map((d) => {
    if (d.entries.length === 0) return { label: d.label, score: null };
    const score = d.entries.reduce((s, e) => s + entryScore(e), 0) / d.entries.length;
    const strongest = [...d.entries].sort((a, b) => b.intensity - a.intensity)[0]!;
    return { label: d.label, score, emoji: moodOf(strongest.mood).emoji };
  });

  const dist = moodDistribution(entries);
  const triggers = triggerRanking(entries);
  const insight = analyzeEntries(entries);
  const breakdown = useMemo(() => triggerMoodBreakdown(entries), [entries]);
  const slots = useMemo(() => timeOfDayStats(entries), [entries]);

  if (ready && entries.length === 0) {
    return (
      <div className="card-soft px-6 py-14 text-center">
        <h1 className="font-display text-2xl font-semibold">了解你的情绪</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          还没有记录。写下第一条感受后，这里会出现你的情绪趋势。
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
        >
          去记录情绪
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">了解你的情绪</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          这些只是从你的记录里看到的一些线索，不是诊断。
        </p>
      </header>

      <SampleNotice />

      <section className="card-soft px-6 py-6 sm:px-8">
        <h2 className="font-display text-lg font-semibold">最近 7 天情绪趋势</h2>
        <TrendChart points={points} />
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card-soft px-6 py-6">
          <h2 className="font-display text-lg font-semibold">高频情绪</h2>
          <ul className="mt-5 space-y-4">
            {dist.slice(0, 5).map((d) => (
              <li key={d.mood.key}>
                <div className="flex items-center justify-between text-sm">
                  <span>
                    {d.mood.emoji} {d.mood.label}
                  </span>
                  <span className="text-muted-foreground">{d.percent}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${d.percent}%`, backgroundColor: d.mood.color }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card-soft px-6 py-6">
          <h2 className="font-display text-lg font-semibold">触发因素频率排行</h2>
          {triggers.length === 0 ? (
            <p className="mt-5 text-sm text-muted-foreground">
              记录时勾选触发因素标签，这里就会出现排行。
            </p>
          ) : (
            <ul className="mt-5 space-y-3">
              {triggers.slice(0, 6).map((t) => (
                <li key={t.key} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-sm">{t.label}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                    <span
                      className="block h-full rounded-full bg-accent"
                      style={{ width: `${Math.max(12, t.ratio * 100)}%` }}
                    />
                  </span>
                  <span className="w-8 text-right text-xs text-muted-foreground">{t.count} 次</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {breakdown.length > 0 && (
        <section className="card-soft px-6 py-6 sm:px-8">
          <h2 className="font-display text-lg font-semibold">触发因素对应的情绪分布</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            每一条代表这个标签下，各种情绪出现的比例。
          </p>
          <ul className="mt-6 space-y-5">
            {breakdown.map((b) => (
              <li key={b.key}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">{b.label}</span>
                  <span className="text-xs text-muted-foreground">{b.count} 条记录</span>
                </div>
                <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-secondary">
                  {b.segments.map((s) => (
                    <span
                      key={s.mood.key}
                      title={`${s.mood.label} ${s.percent}%`}
                      style={{ width: `${s.percent}%`, backgroundColor: s.mood.color }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {b.segments.map((s) => (
                    <span key={s.mood.key} className="flex items-center gap-1">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: s.mood.color }}
                      />
                      {s.mood.label} {s.percent}%
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card-soft px-6 py-6 sm:px-8">
        <h2 className="font-display text-lg font-semibold">一天里的情绪强度</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">按记录时间分成四个时段的平均强度。</p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {slots.map((s) => (
            <div key={s.key} className="rounded-2xl bg-secondary/50 px-4 py-4 text-center">
              <p className="text-xl">{s.emoji}</p>
              <p className="mt-1 text-sm">{s.label}</p>
              <p className="mt-2 font-display text-2xl font-medium">
                {s.avg === null ? "—" : s.avg}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {s.count === 0 ? "暂无记录" : `${s.count} 条 · 平均强度`}
              </p>
            </div>
          ))}
        </div>
      </section>


      <section className="rounded-3xl border border-border bg-primary-soft/70 px-6 py-7 shadow-[var(--shadow-soft)] sm:px-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          从你的记录来看
        </div>
        <h2 className="mt-3 font-display text-xl font-semibold">{insight.headline}</h2>
        <p className="mt-3 text-sm leading-relaxed text-foreground/85">{insight.body}</p>
        <ul className="mt-5 space-y-2">
          {insight.suggestions.map((s) => (
            <li key={s} className="flex gap-2 rounded-2xl bg-card/80 px-4 py-3 text-sm">
              <span>🌱</span>
              <span className="leading-relaxed">{s}</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-xs text-muted-foreground">
          以上内容由你的记录自动整理，仅供自我觉察参考，并非医学诊断。
        </p>
      </section>
    </div>
  );
}
