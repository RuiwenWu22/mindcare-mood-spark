import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Footprints, Moon, Music, Pause, Play, Wind } from "lucide-react";
import { DailyPrompt } from "@/components/daily-prompt";
import { BreathingSession } from "@/components/breathing-session";
import { BREATHING_PLANS } from "@/lib/care-recs";
import { AMBIENT_ORDER, AMBIENT_TRACKS, toggleAmbient } from "@/lib/ambient";
import { useAmbient } from "@/hooks/use-ambient";
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
  const [breathing, setBreathing] = useState<string | null>(null);
  const { playing } = useAmbient();

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
          <h2 className="mt-3 font-display text-xl font-semibold">🧘 挑一个呼吸节奏</h2>
          <ul className="mt-4 space-y-2">
            {PLAN_KEYS.map((k) => {
              const plan = BREATHING_PLANS[k]!;
              return (
                <li key={k}>
                  <button
                    onClick={() => setBreathing(k)}
                    className="w-full rounded-2xl border border-border px-4 py-3 text-left transition-colors hover:bg-secondary"
                  >
                    <span className="block text-sm font-medium">{plan.title}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{plan.rhythm}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>


        <section className="card-soft px-6 py-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Music className="h-4 w-4" /> 放松音乐
          </div>
          <h2 className="mt-3 font-display text-xl font-semibold">🎵 挑一段背景声</h2>
          <p className="mt-1.5 text-xs text-muted-foreground">
            声音由浏览器实时生成，无需下载，到时间会自动淡出。
          </p>
          <ul className="mt-4 space-y-2">
            {AMBIENT_ORDER.map((id) => {
              const m = AMBIENT_TRACKS[id];
              const active = playing === id;
              return (
                <li key={id}>
                  <button
                    onClick={() => {
                      const started = toggleAmbient(id);
                      if (!started && !active) toast("当前浏览器暂不支持播放背景声");
                    }}
                    aria-pressed={active}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                      active ? "border-transparent bg-accent-soft" : "border-border hover:bg-secondary"
                    }`}
                  >
                    <span className="text-xl">{m.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{m.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{m.desc}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                      {active ? (
                        <>
                          <Pause className="h-3.5 w-3.5" /> 播放中
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" /> {m.minutes} 分钟
                        </>
                      )}
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

      {breathing && (
        <BreathingSession plan={BREATHING_PLANS[breathing]!} onClose={() => setBreathing(null)} />
      )}

    </div>
  );
}
