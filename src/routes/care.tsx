import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Footprints, Moon, Music, Wind, X } from "lucide-react";
import { DailyPrompt } from "@/components/daily-prompt";
import { toast } from "sonner";

export const Route = createFileRoute("/care")({
  head: () => ({
    meta: [
      { title: "自我关怀｜MindCare" },
      { name: "description", content: "呼吸练习、放松音乐、轻运动与睡前放松，几分钟就能照顾自己。" },
      { property: "og:title", content: "自我关怀｜MindCare" },
      { property: "og:description", content: "现在，照顾一下自己。" },
    ],
  }),
  component: CarePage,
});

const PLAN_KEYS = ["slow", "box", "relax478"] as const;


const MUSIC = [
  { title: "Calm Morning", desc: "清晨的环境音与轻缓和弦", minutes: 12, emoji: "🌤️" },
  { title: "Soft Piano", desc: "缓慢的钢琴独奏，适合专注或休息", minutes: 18, emoji: "🎹" },
  { title: "Rainy Evening", desc: "雨声与低频背景，帮助入睡", minutes: 25, emoji: "🌧️" },
];

const MOVES = [
  { title: "散步 10 分钟", desc: "不带目的地，走的时候留意呼吸和脚步。" },
  { title: "肩颈拉伸", desc: "左右各 30 秒，慢慢转动肩膀，放松上半身。" },
  { title: "简单伸展", desc: "站起来伸展手臂与腰背，让身体先松下来。" },
];

const NIGHT = [
  "睡前 30 分钟减少屏幕刺激，把灯光调暗一些。",
  "做 5 次深呼吸，让呼气比吸气更长。",
  "写下今天值得感谢的一件事，哪怕很小。",
];

function CarePage() {
  const [breathing, setBreathing] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">现在，照顾一下自己</h1>
        <p className="mt-2 text-sm text-muted-foreground">选一件最容易做到的，就从它开始。</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card-soft px-6 py-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wind className="h-4 w-4" /> 呼吸练习
          </div>
          <h2 className="mt-3 font-display text-xl font-semibold">🧘 2 分钟慢呼吸</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            跟着圆圈的节奏：吸气 4 秒，停留 2 秒，呼气 6 秒。
          </p>
          <button
            onClick={() => setBreathing(true)}
            className="mt-5 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            开始练习
          </button>
        </section>

        <section className="card-soft px-6 py-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Music className="h-4 w-4" /> 放松音乐
          </div>
          <h2 className="mt-3 font-display text-xl font-semibold">🎵 挑一段背景声</h2>
          <ul className="mt-4 space-y-2">
            {MUSIC.map((m) => {
              const active = playing === m.title;
              return (
                <li key={m.title}>
                  <button
                    onClick={() => {
                      setPlaying(active ? null : m.title);
                      if (!active) toast(`正在播放《${m.title}》的氛围推荐 🎧`);
                    }}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                      active ? "border-transparent bg-accent-soft" : "border-border hover:bg-secondary"
                    }`}
                  >
                    <span className="text-xl">{m.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{m.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{m.desc}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {active ? "播放中" : `${m.minutes} 分钟`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card-soft px-6 py-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Footprints className="h-4 w-4" /> 轻运动
          </div>
          <h2 className="mt-3 font-display text-xl font-semibold">🚶 让身体先动起来</h2>
          <ul className="mt-4 space-y-3">
            {MOVES.map((m) => (
              <li key={m.title} className="rounded-2xl bg-secondary/60 px-4 py-3">
                <p className="text-sm font-medium">{m.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{m.desc}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="card-soft px-6 py-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Moon className="h-4 w-4" /> 睡前放松
          </div>
          <h2 className="mt-3 font-display text-xl font-semibold">🌙 把这一天轻轻放下</h2>
          <ul className="mt-4 space-y-3">
            {NIGHT.map((n, i) => (
              <li key={n} className="flex gap-3 text-sm leading-relaxed">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs">
                  {i + 1}
                </span>
                <span className="text-foreground/85">{n}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <DailyPrompt />

      {breathing && <BreathingSession onClose={() => setBreathing(false)} />}
    </div>
  );
}
