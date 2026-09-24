import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { MoodComposer } from "@/components/mood-composer";
import { DailyPrompt } from "@/components/daily-prompt";
import { useEntries } from "@/hooks/use-entries";
import { formatDate, moodOf, weekCount } from "@/lib/mood";

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
  const today = new Date().toDateString();
  const todayEntry = entries.find((e) => new Date(e.createdAt).toDateString() === today);
  const latest = entries[0];

  const stats = [
    {
      label: "今日情绪",
      value: todayEntry ? `${moodOf(todayEntry.mood).emoji} ${moodOf(todayEntry.mood).label}` : "还没记录",
    },
    { label: "本周记录", value: ready ? `${weekCount(entries)} 次` : "—" },
    { label: "最近一次", value: latest ? formatDate(latest.createdAt) : "—" },
  ];

  return (
    <div className="space-y-8">
      <section className="animate-rise">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">MindCare</h1>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">今天，也给自己一点空间。</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="card-soft px-5 py-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-2 font-display text-lg font-medium">{s.value}</p>
          </div>
        ))}
      </section>

      <MoodComposer />

      <DailyPrompt />

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
