import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useEntries } from "@/hooks/use-entries";
import { useBody } from "@/hooks/use-body";
import { useInterventions } from "@/hooks/use-interventions";
import { bodyInsight, bodyMoodStats } from "@/lib/body";
import { CycleCard } from "@/components/cycle-card";
import { AiCard, WhyToggle } from "@/components/ai-card";
import { Placeholder, SectionCard, ValenceRows } from "@/components/section";
import { useRecordSheet } from "@/components/record-sheet";
import { activityStats, entryScore, lastNDays, moodDistribution, moodOf, songsByMood, triggerMoodBreakdown } from "@/lib/mood";
import { DAY_PARTS, nextWeekTips, weeklyDiscovery, whatWorks } from "@/lib/insights";
import { demoData } from "@/lib/demo";

export const Route = createFileRoute("/insights")({
  validateSearch: (s: Record<string, unknown>): { demo?: 1 } => (s["demo"] === 1 || s["demo"] === "1" ? { demo: 1 } : {}),
  head: () => ({
    meta: [
      { title: "洞察｜MindCare" },
      { name: "description", content: "AI 从你的记录中发现情绪规律，以及什么调节方式对你有效。" },
      { property: "og:title", content: "洞察｜MindCare" },
      { property: "og:description", content: "Insight first, data second。" },
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
    <div>
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
    </div>
  );
}

function InsightsPage() {
  const { demo } = Route.useSearch();
  const { open } = useRecordSheet();
  const E = useEntries();
  const I = useInterventions();
  const { logs: realLogs } = useBody();
  // 示例数据只在浏览器里生成，不写入本机记录
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  const sample = useMemo(() => (demo && now ? demoData(now) : null), [demo, now]);
  const entries = sample?.entries ?? E.entries;
  const interventions = sample?.interventions ?? I.interventions;
  const logs = sample?.logs ?? realLogs;
  const ready = demo ? !!sample : E.ready && I.ready && !!now;

  const discovery = useMemo(() => (now ? weeklyDiscovery(entries, now) : null), [entries, now]);
  const methods = useMemo(() => whatWorks(entries, interventions), [entries, interventions]);
  const tips = useMemo(() => (discovery ? nextWeekTips(discovery, methods) : []), [discovery, methods]);
  const days = useMemo(() => lastNDays(entries, 7), [entries]);
  const points = days.map((d) => {
    if (d.entries.length === 0) return { label: d.label, score: null };
    const score = d.entries.reduce((s, e) => s + entryScore(e), 0) / d.entries.length;
    const strongest = [...d.entries].sort((a, b) => b.intensity - a.intensity)[0]!;
    return { label: d.label, score, emoji: moodOf(strongest.mood).emoji };
  });
  const dist = useMemo(() => moodDistribution(entries), [entries]);
  const breakdown = useMemo(() => triggerMoodBreakdown(entries, 6), [entries]);
  const parts = useMemo(
    () =>
      [...DAY_PARTS]
        .sort((a, b) => ["morning", "afternoon", "evening", "night"].indexOf(a.key) - ["morning", "afternoon", "evening", "night"].indexOf(b.key))
        .map((p) => {
          const list = entries.filter((e) => p.test(new Date(e.createdAt).getHours()));
          return {
            ...p,
            count: list.length,
            heavy: list.filter((e) => moodOf(e.mood).valence < 0).length,
            avg: list.length ? Math.round((list.reduce((s, e) => s + e.intensity, 0) / list.length) * 10) / 10 : null,
          };
        }),
    [entries],
  );
  const scenes = useMemo(() => activityStats(entries), [entries]);
  const body = useMemo(() => bodyMoodStats(entries, logs), [entries, logs]);
  const bodyAi = useMemo(() => bodyInsight(entries, logs), [entries, logs]);
  const playlist = useMemo(() => songsByMood(entries), [entries]);

  const recordButton = (
    <button
      onClick={() => open()}
      className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)]"
    >
      记录今天的情绪
    </button>
  );
  const demoButton = (
    <Link
      to="/insights"
      search={{ demo: 1 }}
      className="rounded-full border border-border bg-card px-6 py-3 text-sm font-medium transition-colors hover:bg-secondary"
    >
      看看示例洞察
    </Link>
  );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">洞察</h1>
        <p className="mt-2 text-sm text-muted-foreground">从你的记录里发现情绪规律，以及什么方式对你有效。这些是线索，不是诊断。</p>
      </header>

      {demo && (
        <div className="sticky top-[4.5rem] z-20 flex items-center justify-between gap-3 rounded-2xl border border-dashed border-primary/50 bg-card/95 px-4 py-3 backdrop-blur">
          <p className="text-sm font-medium">示例数据 · 不会保存到你的记录</p>
          <Link to="/insights" className="shrink-0 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
            退出示例
          </Link>
        </div>
      )}

      {!ready || !discovery ? (
        <Placeholder className="h-48 w-full rounded-3xl" />
      ) : !demo && entries.length === 0 ? (
        /* ---------- 空状态 ---------- */
        <AiCard title="AI 本周发现" size="lg">
          <p className="font-display text-2xl font-semibold">还没有足够的记录</p>
          <p className="mt-2 text-sm leading-relaxed text-foreground/85">多记录几次后，MindCare 会逐渐帮助你发现自己的情绪规律。</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {recordButton}
            {demoButton}
          </div>
        </AiCard>
      ) : (
        <>
          {/* 1. AI 本周发现 */}
          <AiCard title="AI 本周发现" size="lg">
            <p className="font-display text-2xl font-semibold leading-snug">{discovery.headline}</p>
            <p className="mt-2 text-sm leading-relaxed text-foreground/85">{discovery.detail}</p>
            {discovery.enough ? (
              <WhyToggle items={discovery.stats} />
            ) : (
              <div className="mt-5 flex flex-wrap gap-2">
                {recordButton}
                {!demo && demoButton}
              </div>
            )}
          </AiCard>

          {/* 2. 什么对我有效 */}
          <SectionCard title="🌿 最近对你帮助比较大的方式" desc="做完调节后，你自己评的强度变化。">
            {methods.length === 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">再完成几次调节练习后，我会慢慢发现什么方式更适合你。</p>
                <Link to="/care" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
                  去试试 →
                </Link>
              </div>
            ) : (
              <>
                <div className="rounded-2xl bg-primary-soft/50 px-4 py-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-display text-lg font-semibold">{methods[0]!.name}</p>
                    <p className="text-xs text-muted-foreground">使用 {methods[0]!.count} 次</p>
                  </div>
                  <p className="mt-2 text-sm">
                    平均情绪强度 <span className="font-display text-xl tabular-nums">{methods[0]!.avgBefore} → {methods[0]!.avgAfter}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {methods[0]!.avgDrop > 0 ? `平均下降 ${methods[0]!.avgDrop}` : "目前还没有明显变化"}
                    {methods[0]!.count < 3 ? " · 次数还不多，仅供参考" : ""}
                  </p>
                </div>
                {methods.length > 1 && (
                  <ul className="mt-3 divide-y divide-border/70">
                    {methods.slice(1, 5).map((m) => (
                      <li key={m.name} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
                        <span>{m.name}</span>
                        <span className="shrink-0 tabular-nums text-foreground/85">
                          {m.avgBefore} → {m.avgAfter}
                          <span className="ml-2 text-xs text-muted-foreground">{m.count} 次</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </SectionCard>

          {/* 3. 下一步建议 */}
          {tips.length > 0 && (
            <SectionCard title="下周可以试试">
              <ul className="space-y-2.5">
                {tips.map((t) => (
                  <li key={t} className="flex gap-2 text-sm leading-relaxed">
                    <span aria-hidden>🌱</span>
                    {t}
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {/* 4. 7 天情绪趋势 */}
          <SectionCard title="最近 7 天情绪趋势" desc="越高代表那天的感受越轻松；空缺表示那天没有记录。">
            <TrendChart points={points} />
          </SectionCard>

          <div className="grid gap-5 md:grid-cols-2">
            {/* 5. 高频情绪 */}
            <SectionCard title="高频情绪">
              <ul className="space-y-3.5">
                {dist.slice(0, 5).map((d) => (
                  <li key={d.mood.key}>
                    <div className="flex items-center justify-between text-sm">
                      <span>
                        {d.mood.emoji} {d.mood.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {d.count} 次 · {d.percent}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full" style={{ width: `${d.percent}%`, backgroundColor: d.mood.color }} />
                    </div>
                  </li>
                ))}
              </ul>
            </SectionCard>

            {/* 6. 触发因素排行 */}
            <SectionCard title="常见的触发因素" desc="每条的颜色是这个原因下出现过的情绪。">
              {breakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">记录时选一下「可能和什么有关」，这里就会出现排行。</p>
              ) : (
                <ul className="space-y-3.5">
                  {breakdown.map((b) => (
                    <li key={b.key}>
                      <div className="flex items-baseline justify-between text-sm">
                        <span>{b.label}</span>
                        <span className="text-xs text-muted-foreground">{b.count} 次</span>
                      </div>
                      <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-secondary">
                        {b.segments.map((s) => (
                          <span
                            key={s.mood.key}
                            title={`${s.mood.label} ${s.percent}%`}
                            style={{ width: `${s.percent}%`, backgroundColor: s.mood.color }}
                          />
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>

          {/* 7. 时段 */}
          <SectionCard title="一天里的情绪变化" desc="不同时段的记录数、平均强度，以及偏消耗的记录有几条。">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {parts.map((p) => (
                <div key={p.key} className="rounded-2xl bg-secondary/50 px-3 py-3 text-center">
                  <p className="text-sm">{p.label}</p>
                  <p className="text-[11px] text-muted-foreground">{p.range}</p>
                  <p className="mt-1.5 font-display text-2xl font-medium tabular-nums">{p.avg === null ? "—" : p.avg}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.count === 0 ? "暂无记录" : `${p.count} 条 · 偏消耗 ${p.heavy}`}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* 更多规律：默认收起 */}
          <details className="group card-soft px-5 py-5 sm:px-7">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium [&::-webkit-details-marker]:hidden">
              更多规律：场景 · 睡眠与活动 · 周期 · 歌单
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-5 space-y-7">
              <div>
                <h3 className="text-sm font-medium">在做什么的时候，感受如何</h3>
                {scenes.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">记录时在「更多」里选一下此刻在做什么。</p>
                ) : (
                  <ValenceRows className="mt-3" rows={scenes} />
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium">睡眠、活动和情绪</h3>
                <p className="mt-1 text-xs text-muted-foreground">看看不同睡眠和活动状态下，你通常处于怎样的情绪状态。</p>
                {body.sleep.every((b) => b.days === 0) && body.activity.every((b) => b.days === 0) ? (
                  <p className="mt-3 text-sm text-muted-foreground">在「今天」记一下睡眠和活动量，这里会显示它们和心情的关系。</p>
                ) : (
                  <>
                    <AiCard title="AI 发现" className="mt-3">
                      {bodyAi.status === "found" ? (
                        <ul className="space-y-2.5">
                          {bodyAi.lines.map((l) => (
                            <li key={l.headline}>
                              <p className="text-[15px] font-medium leading-relaxed">{l.headline}</p>
                              <p className="mt-0.5 text-sm leading-relaxed text-foreground/80">{l.detail}</p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm leading-relaxed">
                          {bodyAi.status === "few"
                            ? "目前记录还比较少，再记录几次后会更容易看出规律。"
                            : "目前还看不出睡眠、活动和情绪之间的明显关系。"}
                        </p>
                      )}
                      <WhyToggle items={bodyAi.evidence} />
                    </AiCard>
                    <div className="mt-5 grid gap-6 md:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted-foreground">睡眠</p>
                        <ValenceRows className="mt-2" rows={body.sleep.map((b) => ({ ...b, label: `睡得${b.label}` }))} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">活动量</p>
                        <ValenceRows className="mt-2" rows={body.activity} />
                      </div>
                    </div>
                  </>
                )}
              </div>
              {!demo && <CycleCard />}
              <div>
                <h3 className="text-sm font-medium">你的情绪歌单</h3>
                {playlist.bright.length === 0 && playlist.heavy.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">记录时在「更多」里填一下此刻在听什么。</p>
                ) : (
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    {(
                      [
                        ["让你舒展的歌", playlist.bright],
                        ["陪你度过难受时刻的歌", playlist.heavy],
                      ] as const
                    ).map(([title, list]) => (
                      <div key={title}>
                        <p className="text-xs text-muted-foreground">{title}</p>
                        {list.length === 0 ? (
                          <p className="mt-1.5 text-xs text-muted-foreground">还没有</p>
                        ) : (
                          <ul className="mt-1.5 space-y-1.5">
                            {list.map((sg) => (
                              <li key={`${sg.title}|${sg.artist ?? ""}`} className="flex items-center justify-between gap-2 text-sm">
                                <span className="min-w-0 truncate">
                                  🎵《{sg.title}》{sg.artist ? ` · ${sg.artist}` : ""}
                                </span>
                                {sg.url && (
                                  <a href={sg.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs underline underline-offset-2">
                                    去听
                                  </a>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
