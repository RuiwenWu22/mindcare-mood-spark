import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { MoodComposer } from "@/components/mood-composer";
import { TodayCard } from "@/components/today-card";
import { SampleNotice } from "@/components/sample-notice";
import { Placeholder } from "@/components/section";
import { useEntries } from "@/hooks/use-entries";
import { useBody } from "@/hooks/use-body";
import { useDaily } from "@/hooks/use-daily";
import { isSample, moodOf, weekCount } from "@/lib/mood";
import { ACTIVITY_LEVELS, SLEEP_OPTIONS, levelOf, sleepOf } from "@/lib/body";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MindCare｜今天，也给自己一点空间" },
      {
        name: "description",
        content: "用一分钟记录此刻的情绪，MindCare 会帮你看见最近的情绪变化与可能的触发因素。",
      },
      { property: "og:title", content: "MindCare｜今天，也给自己一点空间" },
      { property: "og:description", content: "轻量的情绪记录与自我关怀工具。" },
    ],
  }),
  component: Index,
});

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function greetingOf(d: Date) {
  const h = d.getHours();
  if (h < 5) return "夜深了";
  if (h < 11) return "早上好";
  if (h < 14) return "中午好";
  if (h < 18) return "下午好";
  return "晚上好";
}

/** 今日状态里的一格：手机上是一行（名称在左），宽屏上是一列 */
function StatusCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-3 px-5 py-3 sm:block sm:min-h-0 sm:py-4">
      <p className="shrink-0 text-xs text-muted-foreground">{label}</p>
      <div className="flex min-w-0 justify-end sm:mt-2 sm:block">{children}</div>
    </div>
  );
}

function Index() {
  const { entries, ready } = useEntries();
  // 顶部状态只看用户自己的记录，示例数据不应该冒充"你今天的情绪"
  const own = entries.filter((e) => !isSample(e));
  const body = useBody();
  const tb = body.today;
  // 翻签前，睡眠问题由今日卡片来问，避免同一屏问两次
  const daily = useDaily();
  // 问候语和日期依赖本地时间，只在浏览器里计算，避免和服务端渲染不一致
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  const todayEntry = now ? own.find((e) => new Date(e.createdAt).toDateString() === now.toDateString()) : undefined;

  const chip = "rounded-full border border-border bg-card px-2.5 py-1 text-xs transition-colors hover:bg-secondary";
  const value = "font-display text-base font-medium sm:text-lg";

  return (
    <div className="space-y-6">
      <header className="animate-rise">
        {now ? (
          <>
            <h1 className="font-display text-3xl font-semibold tracking-tight">{greetingOf(now)}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {now.getMonth() + 1} 月 {now.getDate()} 日 {WEEKDAYS[now.getDay()]}
              {ready && own.length > 0 ? ` · 这周记录了 ${weekCount(own)} 次` : ""} · 今天，也给自己一点空间。
            </p>
          </>
        ) : (
          <>
            <Placeholder className="h-9 w-32" />
            <Placeholder className="mt-3 h-4 w-64" />
          </>
        )}
      </header>

      <SampleNotice />

      {/* 今日状态：一眼看到今天，空着的格子可以直接点选 */}
      <section
        className="card-soft grid divide-y divide-border/70 overflow-hidden sm:grid-cols-3 sm:divide-x sm:divide-y-0"
        aria-label="今日状态"
      >
        <StatusCell label="今日情绪">
          {!ready || !now ? (
            <Placeholder className="h-6 w-20" />
          ) : todayEntry ? (
            <p className={value}>
              {moodOf(todayEntry.mood).emoji} {moodOf(todayEntry.mood).label}
            </p>
          ) : (
            <a href="#record" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
              还没记录
            </a>
          )}
        </StatusCell>

        <StatusCell label="昨晚睡眠">
          {!body.ready || !daily.ready ? (
            <Placeholder className="h-6 w-20" />
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
            <p className="text-sm text-muted-foreground">翻开今日一签时记录</p>
          ) : (
            <div className="flex flex-wrap justify-end gap-1.5 sm:justify-start" role="group" aria-label="昨晚睡得怎么样">
              {SLEEP_OPTIONS.map((o) => (
                <button key={o.key} onClick={() => body.update({ sleep: o.key })} className={chip}>
                  {o.emoji} {o.label}
                </button>
              ))}
            </div>
          )}
        </StatusCell>

        <StatusCell label="今日活动">
          {!body.ready ? (
            <Placeholder className="h-6 w-20" />
          ) : tb?.steps !== undefined ? (
            <div>
              <p className={value}>{tb.steps.toLocaleString("zh-CN")} 步</p>
              <p className="mt-0.5 text-right text-xs text-muted-foreground sm:text-left">
                {tb.exercise !== undefined ? `锻炼 ${tb.exercise} 分钟 · ` : ""}来自快捷指令
              </p>
            </div>
          ) : tb?.level ? (
            <p className={value}>
              {levelOf(tb.level).emoji} {levelOf(tb.level).label}
            </p>
          ) : (
            <div className="flex flex-col items-end gap-1.5 sm:items-start">
              <div className="flex flex-wrap justify-end gap-1.5 sm:justify-start" role="group" aria-label="今天动得多吗">
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
              <Link to="/sync" className="text-xs text-muted-foreground underline underline-offset-4">
                用快捷指令自动同步
              </Link>
            </div>
          )}
        </StatusCell>
      </section>

      <MoodComposer id="record" />

      <TodayCard
        onWriteNote={() => document.getElementById("record")?.scrollIntoView({ behavior: "smooth", block: "start" })}
      />
    </div>
  );
}
