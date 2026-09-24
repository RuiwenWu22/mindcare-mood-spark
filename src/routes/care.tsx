import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Play } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { FeedbackStep } from "@/components/feedback-step";
import { ActionRunner, type RunResult } from "@/components/action-runner";
import { SectionCard } from "@/components/section";
import { useRecordSheet } from "@/components/record-sheet";
import { useEntries } from "@/hooks/use-entries";
import { useInterventions } from "@/hooks/use-interventions";
import { ACTIONS, actionByTitle, buildRecommendation, type CareAction } from "@/lib/care-recs";
import { whatWorks } from "@/lib/insights";
import { addIntervention, setAfterScore } from "@/lib/interventions";
import { DAILY_PROMPTS, moodOf, type Entry } from "@/lib/mood";

export const Route = createFileRoute("/care")({
  head: () => ({
    meta: [
      { title: "关怀｜MindCare" },
      { name: "description", content: "根据你刚刚的记录推荐一个调节方式，也可以按此刻的状态换一种。" },
      { property: "og:title", content: "关怀｜MindCare" },
      { property: "og:description", content: "根据你刚刚的记录，为你推荐。" },
    ],
  }),
  component: CarePage,
});

/** 多久以内的记录算"刚刚"，用来做推荐和调节前的分数 */
const RECENT_HOURS = 6;

/** 每个方法附上"什么时候用"，按用户此刻的状态来理解，而不是按工具分类 */
type Item = { action: CareAction; when: string };
const NOW_ITEMS: Item[] = [
  { action: ACTIONS.slow, when: "现在比较焦虑时" },
  { action: ACTIONS.box, when: "心跳有点快、很紧绷时" },
  { action: ACTIONS.relax478, when: "想让自己慢下来时" },
  { action: ACTIONS.neck, when: "身体很紧绷时" },
];
const LONGER_ITEMS: Item[] = [
  { action: ACTIONS.rain, when: "脑子停不下来时" },
  { action: ACTIONS.waves, when: "想跟着声音放慢呼吸时" },
  { action: ACTIONS.piano, when: "有点低落、想有人陪着时" },
  { action: ACTIONS.morning, when: "状态不错、想延续时" },
  { action: ACTIONS.walk, when: "坐太久、闷得慌时" },
];
const NIGHT_ITEMS: Item[] = [
  { action: ACTIONS.bedtime, when: "想准备睡觉时" },
  { action: ACTIONS.relax478, when: "躺下了还睡不着时" },
];
const NIGHT_TIPS = ["睡前 30 分钟把手机放远一点，把灯光调暗。", "想太多的话，先把脑子里的事写下来再睡。"];

function agoText(iso: string) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  return `${Math.round(min / 60)} 小时前`;
}

function CarePage() {
  const { entries, ready } = useEntries();
  const { interventions } = useInterventions();
  const { open } = useRecordSheet();
  const [running, setRunning] = useState<CareAction | null>(null);
  const [after, setAfter] = useState<{ action: CareAction; result: RunResult; linked: Entry | null } | null>(null);
  const [savedIv, setSavedIv] = useState<string | null>(null);
  const [quote, setQuote] = useState("");
  useEffect(() => setQuote(DAILY_PROMPTS[new Date().getDate() % DAILY_PROMPTS.length]!), []);

  const latest = entries[0];
  const recent =
    ready && latest && Date.now() - new Date(latest.createdAt).getTime() < RECENT_HOURS * 3_600_000 ? latest : null;
  const rec = useMemo(
    () => (recent ? buildRecommendation(recent, entries.slice(1), interventions) : null),
    [recent, entries, interventions],
  );

  const best = useMemo(
    () => whatWorks(entries, interventions).filter((m) => m.avgDrop > 0).slice(0, 3),
    [entries, interventions],
  );
  const start = (a: CareAction) => setRunning(a);
  const onRunClose = (result: RunResult) => {
    const action = running;
    setRunning(null);
    if (action && (result.completed || result.elapsed >= 20)) {
      setSavedIv(null);
      setAfter({ action, result, linked: recent });
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">关怀</h1>
        <p className="mt-2 text-sm text-muted-foreground">我现在可以做什么？选一件最容易做到的，就从它开始。</p>
      </header>

      {/* ---------- 根据你刚刚的记录 ---------- */}
      {recent && rec ? (
        <section className="card-soft px-5 py-6 sm:px-7" aria-label="为你推荐">
          <p className="text-sm text-muted-foreground">根据你{agoText(recent.createdAt)}的记录，为你推荐</p>
          <p className="mt-3 text-sm">
            {moodOf(recent.mood).emoji} {moodOf(recent.mood).label} · {recent.intensity}/5
          </p>
          <p className="mt-2 flex items-center gap-2 font-display text-2xl font-semibold">
            <span aria-hidden>{rec.primary.emoji}</span>
            {rec.primary.title}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground/85">{rec.reason}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => start(rec.primary)}
              className="rounded-full bg-primary px-7 py-3 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)]"
            >
              开始
            </button>
            <a href="#now" className="rounded-full border border-border px-5 py-3 text-sm transition-colors hover:bg-secondary">
              其他方式
            </a>
          </div>
        </section>
      ) : (
        ready && (
          <button
            onClick={() => open()}
            className="w-full rounded-2xl border border-dashed border-border px-5 py-4 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary/50"
          >
            先记一下现在的感受，推荐会更适合你，做完还能看到前后的变化 →
          </button>
        )
      )}

      {/* ---------- 对你最有效 ---------- */}
      <SectionCard title="对你最有效" desc="按你做完调节后自己评的分排序：强度下降越多，排得越前。" className="bg-primary-soft/40">
        {!ready ? null : best.length === 0 ? (
          <p className="text-sm text-muted-foreground">做完一次调节、评一下前后的感受，这里就会按你自己的效果排序。</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
            {best.map((m, i) => {
              const a = actionByTitle(m.name);
              return (
                <li key={m.name} className="flex flex-col justify-between gap-3 rounded-2xl bg-card px-4 py-3.5">
                  <div>
                    <p className="text-sm font-medium">
                      {a?.emoji ?? "🌿"} {m.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      平均 {m.avgBefore} → {m.avgAfter} · 做了 {m.count} 次
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-display text-lg tabular-nums">↓ {m.avgDrop}</span>
                    {a ? (
                      <button
                        onClick={() => start(a)}
                        className={`rounded-full px-4 py-1.5 text-xs font-medium ${
                          i === 0 && !recent ? "bg-primary text-primary-foreground" : "border border-border hover:bg-secondary"
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

      <ItemsSection id="now" title="现在就能做" desc="两三分钟，坐着也能完成。" items={NOW_ITEMS} onStart={start} />
      <ItemsSection title="需要一点时间" desc="10 分钟左右。背景声到时间会自动淡出，任何页面都能停止。" items={LONGER_ITEMS} onStart={start} />
      <ItemsSection title="睡前" desc="把这一天轻轻放下。" items={NIGHT_ITEMS} onStart={start}>
        <ul className="mt-3 space-y-1.5 text-sm text-foreground/80">
          {NIGHT_TIPS.map((t) => (
            <li key={t}>· {t}</li>
          ))}
        </ul>
      </ItemsSection>

      <p className="px-1 text-center text-xs leading-relaxed text-muted-foreground">
        {quote}
      </p>

      {running && <ActionRunner action={running} onClose={onRunClose} />}

      <BottomSheet open={!!after} onClose={() => setAfter(null)} label="感觉有变化吗">
        {after &&
          (after.linked ? (
            <FeedbackStep
              moodLabel={moodOf(after.linked.mood).label}
              before={after.linked.intensity}
              negative={moodOf(after.linked.mood).valence < 0}
              actionTitle={after.action.title}
              onPick={(n) => {
                if (savedIv) setAfterScore(savedIv, n);
                else
                  setSavedIv(
                    addIntervention({
                      intervention_type: after.action.kind,
                      intervention_name: after.action.title,
                      before_score: after.linked!.intensity,
                      after_score: n,
                      duration: after.result.elapsed,
                      linked_mood_record_id: after.linked!.id,
                    }).id,
                  );
              }}
              onDone={() => setAfter(null)}
            />
          ) : (
            <div className="py-2 text-center">
              <p className="font-display text-xl font-semibold">做完了</p>
              <p className="mt-2 text-sm text-muted-foreground">想记一下现在的感受吗？下次推荐会更适合你。</p>
              <button
                onClick={() => {
                  setAfter(null);
                  open();
                }}
                className="mt-5 w-full rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
              >
                记录此刻的情绪
              </button>
            </div>
          ))}
      </BottomSheet>
    </div>
  );
}

function ItemsSection({
  id,
  title,
  desc,
  items,
  onStart,
  children,
}: {
  id?: string;
  title: string;
  desc: string;
  items: Item[];
  onStart: (a: CareAction) => void;
  children?: React.ReactNode;
}) {
  return (
    <SectionCard {...(id ? { id } : {})} title={title} desc={desc}>
      <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {items.map(({ action: a, when }) => (
          <li key={`${a.id}-${when}`}>
            <button
              onClick={() => onStart(a)}
              className="flex w-full items-center gap-3 rounded-2xl border border-border px-4 py-3.5 text-left transition-colors hover:bg-secondary"
            >
              <span className="text-xl" aria-hidden>
                {a.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{a.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {when} · {a.desc}
                </span>
              </span>
              <Play className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>
      {children}
    </SectionCard>
  );
}
