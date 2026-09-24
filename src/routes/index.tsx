import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { MoodComposer } from "@/components/mood-composer";
import { TodayCard } from "@/components/today-card";
import { SampleNotice } from "@/components/sample-notice";
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

function Index() {
  const { entries, ready } = useEntries();
  // 顶部统计只看用户自己的记录，示例数据不应该冒充"你今天的情绪"
  const own = entries.filter((e) => !isSample(e));
  const today = new Date().toDateString();
  const todayEntry = own.find((e) => new Date(e.createdAt).toDateString() === today);
  const body = useBody();
  const tb = body.today;
  // 翻签前，睡眠问题由今日卡片来问，避免同一屏问两次
  const daily = useDaily();

  const chip =
    "rounded-full border border-border px-2.5 py-1 text-xs transition-colors hover:bg-secondary";

  return (
    <div className="space-y-8">
      <section className="animate-rise">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">MindCare</h1>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">今天，也给自己一点空间。</p>
        <Link
          to="/about"
          className="mt-3 inline-flex text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          了解 MindCare 的设计思路
        </Link>
      </section>

      <SampleNotice />

      {/* 今日摘要：像健康 App 一样，一眼看到今天的状态；空着的格子可以直接点选 */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="今日摘要">
        <div className="card-soft px-5 py-4">
          <p className="text-xs text-muted-foreground">今日情绪</p>
          <p className="mt-2 font-display text-lg font-medium">
            {todayEntry ? `${moodOf(todayEntry.mood).emoji} ${moodOf(todayEntry.mood).label}` : "还没记录"}
          </p>
        </div>

        <div className="card-soft px-5 py-4">
          <p className="text-xs text-muted-foreground">昨晚睡眠</p>
          {!body.ready || !daily.ready ? (
            <p className="mt-2 font-display text-lg font-medium">—</p>
          ) : !tb?.sleep && !daily.state.flipped ? (
            <p className="mt-2 text-sm text-muted-foreground">翻开今日一签时记录</p>
          ) : tb?.sleep ? (
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <p className="font-display text-lg font-medium">
                {sleepOf(tb.sleep).emoji} {sleepOf(tb.sleep).label}
              </p>
              <button
                onClick={() => body.unset("sleep")}
                className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                改
              </button>
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="昨晚睡得怎么样">
              {SLEEP_OPTIONS.map((o) => (
                <button key={o.key} onClick={() => body.update({ sleep: o.key })} className={chip}>
                  {o.emoji} {o.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card-soft px-5 py-4">
          <p className="text-xs text-muted-foreground">今日活动</p>
          {!body.ready ? (
            <p className="mt-2 font-display text-lg font-medium">—</p>
          ) : tb?.steps !== undefined ? (
            <>
              <p className="mt-2 font-display text-lg font-medium">{tb.steps.toLocaleString("zh-CN")} 步</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {tb.exercise !== undefined ? `锻炼 ${tb.exercise} 分钟 · ` : ""}来自快捷指令
              </p>
            </>
          ) : tb?.level ? (
            <p className="mt-2 font-display text-lg font-medium">
              {levelOf(tb.level).emoji} {levelOf(tb.level).label}
            </p>
          ) : (
            <>
              <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="今天动得多吗">
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
              <Link to="/sync" className="mt-2 inline-flex text-xs text-muted-foreground underline underline-offset-4">
                用快捷指令自动同步
              </Link>
            </>
          )}
        </div>

        <div className="card-soft px-5 py-4">
          <p className="text-xs text-muted-foreground">本周记录</p>
          <p className="mt-2 font-display text-lg font-medium">{ready ? `${weekCount(own)} 次` : "—"}</p>
        </div>
      </section>

      <TodayCard
        onWriteNote={() => document.getElementById("record")?.scrollIntoView({ behavior: "smooth", block: "start" })}
      />

      <MoodComposer id="record" />

      <section className="grid gap-3 sm:grid-cols-2">
        <Link to="/insights" className="card-lift flex items-center justify-between px-6 py-5">
          <div>
            <p className="font-medium">看看最近的变化</p>
            <p className="mt-1 text-sm text-muted-foreground">7 天趋势、高频情绪与触发因素</p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </Link>
        <Link to="/care" className="card-lift flex items-center justify-between px-6 py-5">
          <div>
            <p className="font-medium">现在照顾一下自己</p>
            <p className="mt-1 text-sm text-muted-foreground">呼吸练习、放松音乐与轻运动</p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </Link>
      </section>
    </div>
  );
}
