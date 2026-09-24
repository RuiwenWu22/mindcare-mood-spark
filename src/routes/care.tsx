import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, Play } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { FeedbackStep } from "@/components/feedback-step";
import { ActionRunner, type RunResult } from "@/components/action-runner";
import { SectionCard } from "@/components/section";
import { useRecordSheet } from "@/components/record-sheet";
import { useEntries } from "@/hooks/use-entries";
import { useInterventions } from "@/hooks/use-interventions";
import { ACTIONS, buildRecommendation, type CareAction } from "@/lib/care-recs";
import { addIntervention, setAfterScore } from "@/lib/interventions";
import { DAILY_PROMPTS, moodOf, type Entry } from "@/lib/mood";

export const Route = createFileRoute("/care")({
  head: () => ({
    meta: [
      { title: "照顾一下自己｜MindCare" },
      { name: "description", content: "根据你刚刚的记录推荐一个调节方式，也可以按此刻的状态换一种。" },
      { property: "og:title", content: "照顾一下自己｜MindCare" },
      { property: "og:description", content: "根据你刚刚的记录，为你推荐。" },
    ],
  }),
  component: CarePage,
});

/** 多久以内的记录算"刚刚"，用来做推荐和调节前的分数 */
const RECENT_HOURS = 6;

/** 按此刻的状态组织，而不是按工具分类 */
const BY_STATE: { emoji: string; state: string; action: CareAction }[] = [
  { emoji: "🌀", state: "脑子停不下来", action: ACTIONS.rain },
  { emoji: "😤", state: "身体很紧绷", action: ACTIONS.neck },
  { emoji: "😴", state: "想准备睡觉", action: ACTIONS.bedtime },
  { emoji: "😟", state: "现在比较焦虑", action: ACTIONS.slow },
];

const LIBRARY: { title: string; items: CareAction[] }[] = [
  { title: "呼吸", items: [ACTIONS.slow, ACTIONS.box, ACTIONS.relax478] },
  { title: "音乐", items: [ACTIONS.rain, ACTIONS.waves, ACTIONS.piano, ACTIONS.morning] },
  { title: "运动", items: [ACTIONS.neck, ACTIONS.walk] },
  { title: "睡眠", items: [ACTIONS.bedtime] },
];

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

  const start = (a: CareAction) => setRunning(a);
  const onRunClose = (result: RunResult) => {
    const action = running;
    setRunning(null);
    if (action && (result.completed || result.elapsed >= 20)) {
      setSavedIv(null);
      setAfter({ action, result, linked: recent });
    }
  };

  const row = "flex w-full items-center gap-3 rounded-2xl border border-border px-4 py-3.5 text-left transition-colors hover:bg-secondary";

  return (
    <div className="space-y-5">
      <header>
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> 今天
        </Link>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">照顾一下自己</h1>
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
            <a href="#other" className="rounded-full border border-border px-5 py-3 text-sm transition-colors hover:bg-secondary">
              其他方式
            </a>
          </div>
        </section>
      ) : (
        <section className="card-soft px-5 py-6 sm:px-7">
          <p className="font-display text-lg font-semibold">先记一下现在的感受</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            记录之后，会根据你的情绪和强度推荐一个方式，做完还能看到前后的变化。
          </p>
          <button
            onClick={() => open()}
            className="mt-4 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)]"
          >
            记录此刻的情绪
          </button>
        </section>
      )}

      {/* ---------- 想换一种方式？ ---------- */}
      <SectionCard id="other" title="想换一种方式？" desc="按你此刻的状态选一个。">
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {BY_STATE.map((s) => (
            <li key={s.state}>
              <button onClick={() => start(s.action)} className={row}>
                <span className="text-2xl" aria-hidden>
                  {s.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{s.state}</span>
                  <span className="block text-xs text-muted-foreground">
                    {s.action.title}
                  </span>
                </span>
                <Play className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* ---------- 探索所有方式 ---------- */}
      <details className="group card-soft px-5 py-5 sm:px-7">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium [&::-webkit-details-marker]:hidden">
          探索所有方式
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-5 space-y-5">
          {LIBRARY.map((g) => (
            <div key={g.title}>
              <p className="text-xs text-muted-foreground">{g.title}</p>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {g.items.map((a) => (
                  <li key={a.id}>
                    <button onClick={() => start(a)} className={row}>
                      <span className="text-xl" aria-hidden>
                        {a.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{a.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">{a.desc}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>

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
