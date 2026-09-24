import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { useEntries } from "@/hooks/use-entries";
import { useBody } from "@/hooks/use-body";
import { bodyFindings, bodyMoodStats, type BodyBucket } from "@/lib/body";
import { SampleNotice } from "@/components/sample-notice";
import {
  activityStats,
  analyzeEntries,
  songsByMood,
  whatWorks,
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
  const { entries, ready, restoreSamples } = useEntries();

  const days = useMemo(() => lastNDays(entries, 7), [entries]);
  const points = days.map((d) => {
    if (d.entries.length === 0) return { label: d.label, score: null };
    const score = d.entries.reduce((s, e) => s + entryScore(e), 0) / d.entries.length;
    const strongest = [...d.entries].sort((a, b) => b.intensity - a.intensity)[0]!;
    return { label: d.label, score, emoji: moodOf(strongest.mood).emoji };
  });

  const dist = moodDistribution(entries);
  const triggers = triggerRanking(entries);
  const { logs } = useBody();
  const body = useMemo(() => bodyMoodStats(entries, logs), [entries, logs]);
  const playlist = useMemo(() => songsByMood(entries), [entries]);
  const insight = analyzeEntries(entries, bodyFindings(entries, logs));
  const breakdown = useMemo(() => triggerMoodBreakdown(entries), [entries]);
  const slots = useMemo(() => timeOfDayStats(entries), [entries]);
  const scenes = useMemo(() => activityStats(entries), [entries]);
  const methods = useMemo(() => whatWorks(entries), [entries]);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  if (ready && entries.length === 0) {
    return (
      <div className="card-soft px-6 py-14 text-center">
        <h1 className="font-display text-2xl font-semibold">了解你的情绪</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          还没有记录。写下第一条感受后，这里会出现你的情绪趋势。
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            to="/"
            className="inline-flex rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
          >
            去记录情绪
          </Link>
          <button
            onClick={restoreSamples}
            className="inline-flex rounded-full border border-border bg-card px-6 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
          >
            载入示例看看效果
          </button>
        </div>
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
        <h2 className="font-display text-lg font-semibold">在做什么的时候，感受如何</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          按记录时选的「此刻在做什么」分组，看看哪些场景让你更舒展、哪些更消耗。
        </p>
        {scenes.length === 0 ? (
          <p className="mt-5 text-sm text-muted-foreground">
            记录时选一下「此刻在做什么」，这里会显示不同场景下的感受。
          </p>
        ) : (
          <>
            <ul className="mt-6 space-y-4">
              {scenes.map((sc) => (
                <li key={sc.key}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span>
                      {sc.emoji} {sc.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{sc.count} 条记录</span>
                  </div>
                  <div
                    className="mt-2 flex h-3 overflow-hidden rounded-full bg-secondary"
                    title={`舒展 ${sc.bright} · 一般 ${sc.neutral} · 偏消耗 ${sc.heavy}`}
                  >
                    <span style={{ width: `${(sc.bright / sc.count) * 100}%`, backgroundColor: "var(--mood-calm)" }} />
                    <span style={{ width: `${(sc.neutral / sc.count) * 100}%`, backgroundColor: "var(--mood-neutral)" }} />
                    <span style={{ width: `${(sc.heavy / sc.count) * 100}%`, backgroundColor: "var(--mood-anxious)" }} />
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {[
                ["舒展", "var(--mood-calm)"],
                ["一般", "var(--mood-neutral)"],
                ["偏消耗", "var(--mood-anxious)"],
              ].map(([label, color]) => (
                <span key={label} className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  {label}
                </span>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="card-soft px-6 py-6 sm:px-8">
        <h2 className="font-display text-lg font-semibold">身体和情绪</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          把每天的睡眠、活动量和当天的记录放在一起看。数据来自首页的一键记录或快捷指令同步。
        </p>
        {body.sleep.every((b) => b.days === 0) && body.activity.every((b) => b.days === 0) ? (
          <p className="mt-5 text-sm text-muted-foreground">
            在首页记一下昨晚睡得怎么样、今天动得多不多，这里会显示它们和心情的关系。
          </p>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <BodyBlock title="睡眠" buckets={body.sleep} />
            <BodyBlock title="活动量" buckets={body.activity} />
          </div>
        )}
      </section>

      <section className="card-soft px-6 py-6 sm:px-8">
        <h2 className="font-display text-lg font-semibold">你的情绪歌单</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">来自记录时填写的「此刻在听什么」。</p>
        {playlist.bright.length === 0 && playlist.heavy.length === 0 ? (
          <p className="mt-5 text-sm text-muted-foreground">
            记录时填一下「此刻在听什么」，这里会整理出你的情绪歌单。
          </p>
        ) : (
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {(
              [
                ["让你舒展的歌", playlist.bright],
                ["陪你度过难受时刻的歌", playlist.heavy],
              ] as const
            ).map(([title, list]) => (
              <div key={title}>
                <h3 className="text-sm font-medium">{title}</h3>
                {list.length === 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">还没有</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {list.map((sg) => (
                      <li key={`${sg.title}|${sg.artist ?? ""}`} className="flex items-center justify-between gap-2 rounded-2xl bg-secondary/50 px-4 py-2.5 text-sm">
                        <span className="min-w-0 truncate">
                          🎵《{sg.title}》{sg.artist ? ` · ${sg.artist}` : ""}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {sg.count > 1 ? `${sg.count} 次` : ""}
                          {sg.sampleOnly ? " 示例" : ""}
                          {sg.url && (
                            <a href={sg.url} target="_blank" rel="noopener noreferrer" className="ml-2 underline underline-offset-2">
                              去听
                            </a>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

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


      <section className="card-soft px-6 py-6 sm:px-8">
        <h2 className="font-display text-lg font-semibold">什么对我有效</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          在紧绷或低落时做完调节、又评了一次分的记录。下降越多，说明这个方法对你越有帮助。
        </p>
        {methods.length === 0 ? (
          <p className="mt-5 text-sm text-muted-foreground">
            下次做完呼吸练习后评一下现在的感受，这里会告诉你哪种方法对你更有效。
          </p>
        ) : (
          <ul className="mt-5 space-y-3">
            {methods.map((m, i) => (
              <li
                key={m.label}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-secondary/50 px-4 py-3.5"
              >
                <div>
                  <p className="text-sm font-medium">
                    🫁 {m.label}
                    {i === 0 && m.avgDrop >= 1 && (
                      <span className="ml-2 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-normal">
                        目前最有效
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    做了 {m.count} 次 · 平均 {m.avgBefore} → {m.avgAfter}
                    {m.sampleOnly ? " · 示例数据" : ""}
                    {m.count < 3 ? " · 记录还不多，仅供参考" : ""}
                  </p>
                </div>
                <span className="font-display text-lg tabular-nums">
                  {m.avgDrop > 0 ? `↓ ${m.avgDrop}` : m.avgDrop < 0 ? `↑ ${-m.avgDrop}` : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-primary-soft/70 px-6 py-7 shadow-[var(--shadow-soft)] sm:px-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          从你的记录来看
        </div>
        <h2 className="mt-3 font-display text-xl font-semibold">{insight.headline}</h2>
        <p className="mt-3 text-sm leading-relaxed text-foreground/85">{insight.body}</p>
        {insight.evidence.length > 0 && (
          <>
            <button
              onClick={() => setEvidenceOpen((v) => !v)}
              aria-expanded={evidenceOpen}
              className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              为什么这样说？
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${evidenceOpen ? "rotate-180" : ""}`} />
            </button>
            {evidenceOpen && (
              <ul className="mt-2 space-y-1.5 border-l-2 border-primary/40 pl-3 text-xs leading-relaxed text-foreground/80">
                {insight.evidence.map((ev) => (
                  <li key={ev}>{ev}</li>
                ))}
              </ul>
            )}
          </>
        )}
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

function BodyBlock({ title, buckets }: { title: string; buckets: BodyBucket[] }) {
  return (
    <div>
      <h3 className="text-sm font-medium">{title}</h3>
      <ul className="mt-3 space-y-3">
        {buckets.map((b) => (
          <li key={b.key}>
            <div className="flex items-baseline justify-between text-sm">
              <span>
                {b.emoji} {b.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {b.days} 天 · {b.records} 条记录
              </span>
            </div>
            <div
              className="mt-1.5 flex h-2.5 overflow-hidden rounded-full bg-secondary"
              title={`舒展 ${b.bright} · 一般 ${b.neutral} · 偏消耗 ${b.heavy}`}
            >
              {b.records > 0 && (
                <>
                  <span style={{ width: `${(b.bright / b.records) * 100}%`, backgroundColor: "var(--mood-calm)" }} />
                  <span style={{ width: `${(b.neutral / b.records) * 100}%`, backgroundColor: "var(--mood-neutral)" }} />
                  <span style={{ width: `${(b.heavy / b.records) * 100}%`, backgroundColor: "var(--mood-anxious)" }} />
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
