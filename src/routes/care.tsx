import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pause, Play } from "lucide-react";
import { DailyPrompt } from "@/components/daily-prompt";
import { BreathingSession } from "@/components/breathing-session";
import { BREATHING_PLANS, type BreathingKey } from "@/lib/care-recs";
import { RecommendationPanel } from "@/components/recommendation-panel";
import { useEntries } from "@/hooks/use-entries";
import { isSample, moodOf, whatWorks } from "@/lib/mood";
import { SectionCard } from "@/components/section";
import { assessRisk } from "@/lib/safety";
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

const PLAN_KEYS: BreathingKey[] = ["slow", "box", "relax478"];

/** 最近多久内的记录，才在自我关怀页顶部做个性化推荐 */
const RECENT_HOURS = 6;

function agoText(iso: string) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  return `${Math.round(min / 60)} 小时前`;
}



const QUICK_MOVES = [
  { title: "肩颈拉伸", desc: "左右各 30 秒，慢慢转动肩膀，放松上半身。" },
  { title: "简单伸展", desc: "站起来伸展手臂与腰背，让身体先松下来。" },
];
const WALK = { title: "散步 10 分钟", desc: "不带目的地，走的时候留意呼吸和脚步。" };

const planKeyByTitle = (title: string) => PLAN_KEYS.find((k) => BREATHING_PLANS[k].title === title);

const NIGHT = [
  "睡前 30 分钟减少屏幕刺激，把灯光调暗一些。",
  "做 5 次深呼吸，让呼气比吸气更长。",
  "写下今天值得感谢的一件事，哪怕很小。",
];

function CarePage() {
  const [breathing, setBreathing] = useState<BreathingKey | null>(null);
  const { playing } = useAmbient();
  const { entries, ready } = useEntries();
  // 只根据用户自己最近的一条记录做推荐，示例数据不参与
  const latestOwn = entries.find((e) => !isSample(e));
  const recent =
    ready && latestOwn && Date.now() - new Date(latestOwn.createdAt).getTime() < RECENT_HOURS * 3_600_000
      ? latestOwn
      : null;
  // 对你最有效：用评过分的调节记录排序，只取确实让强度下降的
  const best = whatWorks(entries)
    .filter((m) => m.avgDrop > 0)
    .slice(0, 3);

  const item = "rounded-2xl border border-border px-4 py-3 text-left";
  const tap = `${item} w-full transition-colors hover:bg-secondary`;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">关怀</h1>
        <p className="mt-2 text-sm text-muted-foreground">选一件最容易做到的，就从它开始。</p>
      </header>

      {recent && (
        <section className="card-soft px-5 pb-6 pt-1 sm:px-7">
          <RecommendationPanel
            key={recent.id}
            entry={recent}
            risk={assessRisk({
              valence: moodOf(recent.mood).valence,
              intensity: recent.intensity,
              note: recent.note,
            })}
            heading={`根据你${agoText(recent.createdAt)}的记录，更推荐你`}
            showCareLink={false}
          />
        </section>
      )}

      <SectionCard
        title="对你最有效"
        desc="按你做完调节后自己评的分排序：强度下降越多，排得越前。"
        className="bg-primary-soft/40"
      >
        {!ready ? null : best.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            紧绷或低落时做一次呼吸练习，做完评一下感受，这里就会按你自己的效果排序。
          </p>
        ) : (
          <ul className="grid gap-2.5 md:grid-cols-3">
            {best.map((m, i) => {
              const key = m.method === "breathing" ? planKeyByTitle(m.label) : undefined;
              return (
                <li key={m.label} className="flex flex-col justify-between gap-3 rounded-2xl bg-card px-4 py-3.5">
                  <div>
                    <p className="text-sm font-medium">
                      {m.method === "breathing" ? "🫁" : "🌿"} {m.label}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      平均 {m.avgBefore} → {m.avgAfter} · 做了 {m.count} 次{m.sampleOnly ? " · 示例数据" : ""}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-display text-lg tabular-nums">↓ {m.avgDrop}</span>
                    {key ? (
                      <button
                        onClick={() => setBreathing(key)}
                        className={`rounded-full px-4 py-1.5 text-xs font-medium ${
                          i === 0 ? "bg-primary text-primary-foreground" : "border border-border hover:bg-secondary"
                        }`}
                      >
                        开始
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">来自今日小计划</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="现在就能做" desc="两分钟左右，坐着也能完成。">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {PLAN_KEYS.map((k) => {
            const plan = BREATHING_PLANS[k];
            return (
              <button key={k} onClick={() => setBreathing(k)} className={tap}>
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">🫁 {plan.title}</span>
                  <Play className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">{plan.rhythm}</span>
              </button>
            );
          })}
          {QUICK_MOVES.map((m) => (
            <div key={m.title} className={item}>
              <p className="text-sm font-medium">🙆 {m.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{m.desc}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="需要一点时间" desc="10 到 25 分钟。背景声由浏览器实时生成，到时间会自动淡出，任何页面都能停止。">
        <div className="grid gap-2.5 sm:grid-cols-2">
          {AMBIENT_ORDER.map((id) => {
            const m = AMBIENT_TRACKS[id];
            const active = playing === id;
            return (
              <button
                key={id}
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
            );
          })}
          <div className={item}>
            <p className="text-sm font-medium">🚶 {WALK.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{WALK.desc}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="睡前" desc="把这一天轻轻放下。">
        <ol className="space-y-3">
          {NIGHT.map((n, i) => (
            <li key={n} className="flex gap-3 text-sm leading-relaxed">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs">
                {i + 1}
              </span>
              <span className="text-foreground/85">{n}</span>
            </li>
          ))}
        </ol>
        <button
          onClick={() => setBreathing("relax478")}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm transition-colors hover:bg-secondary"
        >
          <Play className="h-3.5 w-3.5" /> 睡前做一次 4-7-8 放松呼吸
        </button>
      </SectionCard>

      <DailyPrompt />

      {breathing && <BreathingSession plan={BREATHING_PLANS[breathing]} onClose={() => setBreathing(null)} />}
    </div>
  );
}
