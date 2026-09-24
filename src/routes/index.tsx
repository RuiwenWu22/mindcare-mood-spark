import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { TodayCard } from "@/components/today-card";
import { RecoveryCard } from "@/components/recovery/recovery-card";
import { Placeholder } from "@/components/section";
import { useRecordSheet } from "@/components/record-sheet";
import { WhyToggle } from "@/components/ai-card";
import { useEntries } from "@/hooks/use-entries";
import { useBody } from "@/hooks/use-body";
import { useDaily } from "@/hooks/use-daily";
import { useInterventions } from "@/hooks/use-interventions";
import { MOODS, dayKey, entryDay, moodOf } from "@/lib/mood";
import { ACTIVITY_LEVELS, SLEEP_OPTIONS, levelOf, sleepOf } from "@/lib/body";
import { latestWithIntervention, recentYou } from "@/lib/insights";
import { understandEntry } from "@/lib/understand";
import { buildRecommendation } from "@/lib/care-recs";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MindCare｜不只记录情绪，也慢慢读懂自己" },
      {
        name: "description",
        content: "记录此刻的情绪，AI 从你的记录中发现情绪触发因素，并找到更适合你的调节方式。",
      },
      { property: "og:title", content: "MindCare｜不只记录情绪，也慢慢读懂自己" },
      { property: "og:description", content: "记录 → 理解 → 行动 → 反馈 → 学习。" },
    ],
  }),
  component: TodayPage,
});

const LOOP = ["记录", "AI 理解", "调节", "反馈", "越来越懂你"];

function TodayPage() {
  const { open } = useRecordSheet();
  const { entries, ready } = useEntries();
  const { interventions } = useInterventions();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  const latest = useMemo(() => latestWithIntervention(entries, interventions), [entries, interventions]);
  const today = latest && now && entryDay(latest.entry) === dayKey(now) ? latest : null;
  const you = useMemo(() => (now ? recentYou(entries, now) : null), [entries, now]);

  return (
    <div className="space-y-6">
      {/* ---------- 产品价值：第一屏直接看到 ---------- */}
      <header className="animate-rise pt-2">
        <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight sm:text-4xl">
          不只记录情绪，也慢慢读懂自己
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-foreground/80">
          AI 从你的记录中发现情绪触发因素，并找到更适合你的调节方式。
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground">今天，也给自己一点空间。</p>
      </header>

      {/* ---------- 首屏视觉中心：情绪记录 ---------- */}
      <section className="card-soft px-5 pb-5 pt-6 sm:px-7 sm:pb-6" aria-labelledby="how-today">
        <h2 id="how-today" className="font-display text-xl font-semibold sm:text-2xl">
          今天感觉怎么样？
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">点一下最接近的，十秒就能记下来。</p>
        <div className="mt-5 grid grid-cols-4 gap-2 sm:gap-3">
          {MOODS.map((m) => (
            <button
              key={m.key}
              onClick={() => open(m.key)}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-secondary/30 px-1 py-3.5 transition-all hover:-translate-y-0.5 hover:bg-secondary sm:py-5"
            >
              <span className="text-[32px] leading-none sm:text-4xl">{m.emoji}</span>
              <span className="whitespace-nowrap text-xs sm:text-sm">{m.label}</span>
            </button>
          ))}
        </div>
        <ol className="mt-5 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-[11px] text-muted-foreground" aria-label="MindCare 怎么帮你">
          {LOOP.map((s, i) => (
            <li key={s} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden>→</span>}
              {s}
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- 今天的记录：AI 整理 + 调节结果 ---------- */}
      {today && <TodayRecord entries={entries} interventions={interventions} data={today} />}

      {/* ---------- 失恋恢复模式：次级场景卡 ---------- */}
      <RecoveryCard />

      <TodayStatus />

      <TodayCard onWriteNote={() => open()} />

      {/* ---------- 最近的你 ---------- */}
      <section className="card-soft px-5 py-5 sm:px-7" aria-label="最近的你">
        {!ready || !you ? (
          <Placeholder className="h-12 w-full" />
        ) : you.count === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">最近的你</p>
              <p className="mt-1 text-xs text-muted-foreground">记录几次之后，这里会出现你最近的情绪规律。</p>
            </div>
            <Link to="/insights" search={{ demo: 1 }} className="text-sm text-muted-foreground underline-offset-4 hover:underline">
              看看示例洞察 →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium">最近的你</p>
              <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
                <div className="flex gap-1.5">
                  <dt className="text-muted-foreground">本周记录</dt>
                  <dd className="font-medium">{you.count} 次</dd>
                </div>
                {you.topMood && (
                  <div className="flex gap-1.5">
                    <dt className="text-muted-foreground">最常出现</dt>
                    <dd className="font-medium">
                      {you.topMood.emoji} {you.topMood.label}
                    </dd>
                  </div>
                )}
                {you.topTrigger && (
                  <div className="flex gap-1.5">
                    <dt className="text-muted-foreground">常见原因</dt>
                    <dd className="font-medium">{you.topTrigger}</dd>
                  </div>
                )}
              </dl>
            </div>
            <Link
              to="/insights"
              className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-foreground/80 hover:text-foreground"
            >
              查看完整洞察 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

/** 今天最近一条记录：AI 整理的一句话，以及做过的调节（或下一步） */
function TodayRecord({
  entries,
  interventions,
  data,
}: {
  entries: ReturnType<typeof useEntries>["entries"];
  interventions: ReturnType<typeof useInterventions>["interventions"];
  data: NonNullable<ReturnType<typeof latestWithIntervention>>;
}) {
  const { entry, intervention } = data;
  const m = moodOf(entry.mood);
  const others = entries.filter((e) => e.id !== entry.id);
  const u = understandEntry(entry, others);
  const next = intervention ? null : buildRecommendation(entry, others, interventions).primary;
  const time = new Date(entry.createdAt);
  const hhmm = `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}`;

  return (
    <section className="ai-card px-5 py-5 sm:px-7" aria-label="今天的记录">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-foreground/80">✨ AI 帮你整理了一下</p>
        <p className="text-xs text-muted-foreground">
          {hhmm} · {m.emoji} {m.label} {entry.intensity}/5
        </p>
      </div>
      <p className="mt-2 text-[15px] leading-relaxed">{u.text}</p>
      <WhyToggle items={u.evidence} />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-primary/15 pt-3 text-sm">
        {intervention ? (
          <span>
            🌿 {intervention.intervention_name} · 调节前后 {intervention.before_score} → {intervention.after_score}
          </span>
        ) : (
          <span className="text-foreground/85">
            🌿 此刻更适合你：{next?.emoji} {next?.title}
          </span>
        )}
        <Link to="/care" className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
          想换一种方式？
        </Link>
      </div>
    </section>
  );
}

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[48px] items-center justify-between gap-3 px-5 py-2.5 sm:px-7">
      <p className="shrink-0 text-xs text-muted-foreground">{label}</p>
      <div className="flex min-w-0 justify-end">{children}</div>
    </div>
  );
}

/** 今日状态：睡眠和活动量，一键记录 */
function TodayStatus() {
  const body = useBody();
  const daily = useDaily();
  const tb = body.today;
  const chip = "rounded-full border border-border bg-card px-2.5 py-1 text-xs transition-colors hover:bg-secondary";
  const value = "text-sm font-medium";

  return (
    <section className="card-soft divide-y divide-border/70 overflow-hidden" aria-label="今日状态">
      <Cell label="昨晚睡眠">
        {!body.ready || !daily.ready ? (
          <Placeholder className="h-5 w-20" />
        ) : tb?.sleep ? (
          <div className="flex items-baseline gap-2">
            <p className={value}>
              {sleepOf(tb.sleep).emoji} {sleepOf(tb.sleep).label}
            </p>
            <button onClick={() => body.unset("sleep")} className="text-xs text-muted-foreground underline-offset-4 hover:underline">
              改
            </button>
          </div>
        ) : !daily.state.flipped ? (
          <p className="text-xs text-muted-foreground">翻开今日一签时记录</p>
        ) : (
          <div className="flex flex-wrap justify-end gap-1.5" role="group" aria-label="昨晚睡得怎么样">
            {SLEEP_OPTIONS.map((o) => (
              <button key={o.key} onClick={() => body.update({ sleep: o.key })} className={chip}>
                {o.emoji} {o.label}
              </button>
            ))}
          </div>
        )}
      </Cell>
      <Cell label="今日活动">
        {!body.ready ? (
          <Placeholder className="h-5 w-20" />
        ) : tb?.steps !== undefined ? (
          <p className={value}>
            {tb.steps.toLocaleString("zh-CN")} 步
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              {tb.exercise !== undefined ? `锻炼 ${tb.exercise} 分钟 · ` : ""}快捷指令
            </span>
          </p>
        ) : tb?.level ? (
          <p className={value}>
            {levelOf(tb.level).emoji} {levelOf(tb.level).label}
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <div className="flex gap-1.5" role="group" aria-label="今天动得多吗">
              {ACTIVITY_LEVELS.map((o) => (
                <button
                  key={o.key}
                  onClick={() => body.update({ level: o.key, source: "manual" })}
                  aria-label={o.label}
                  className={chip}
                >
                  {o.emoji} {o.short}
                </button>
              ))}
            </div>
            <Link to="/sync" className="text-[11px] text-muted-foreground underline underline-offset-4">
              自动同步
            </Link>
          </div>
        )}
      </Cell>
    </section>
  );
}
