import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { AiCard, WhyToggle } from "@/components/ai-card";
import { CareSuggestion } from "@/components/care-suggestion";
import { IntensityPicker } from "@/components/intensity-picker";
import { FeedbackStep } from "@/components/feedback-step";
import { ActionRunner, type RunResult } from "@/components/action-runner";
import { SupportCard } from "@/components/support-card";
import { SongField } from "@/components/song-field";
import { useEntries } from "@/hooks/use-entries";
import {
  ACTIVITIES,
  MOODS,
  TRIGGERS,
  loadEntries,
  moodOf,
  type ActivityKey,
  type Entry,
  type MoodKey,
  type TriggerKey,
} from "@/lib/mood";
import { assessRisk, type Risk } from "@/lib/safety";
import { understandEntry } from "@/lib/understand";
import { ACTIONS, buildRecommendation, type CareAction } from "@/lib/care-recs";
import { addIntervention, loadInterventions, setAfterScore } from "@/lib/interventions";
import type { Song } from "@/lib/songs";
import { cn } from "@/lib/utils";

type Ctx = { open: (mood?: MoodKey) => void };
const RecordSheetContext = createContext<Ctx>({ open: () => {} });
export const useRecordSheet = () => useContext(RecordSheetContext);

/** 全站共用一个记录弹层：首页点情绪、记录页点"记一条"都会打开它 */
export function RecordSheetProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ open: boolean; mood: MoodKey | null; key: number }>({
    open: false,
    mood: null,
    key: 0,
  });
  const open = useCallback((mood?: MoodKey) => setState((s) => ({ open: true, mood: mood ?? null, key: s.key + 1 })), []);
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);
  const value = useMemo(() => ({ open }), [open]);

  return (
    <RecordSheetContext.Provider value={value}>
      {children}
      <BottomSheet open={state.open} onClose={close} label="记录此刻的情绪">
        <RecordFlow key={state.key} initialMood={state.mood} onClose={close} />
      </BottomSheet>
    </RecordSheetContext.Provider>
  );
}

type Stage = "form" | "result" | "rest" | "feedback";

function RecordFlow({ initialMood, onClose }: { initialMood: MoodKey | null; onClose: () => void }) {
  const { addEntry } = useEntries();
  const [mood, setMood] = useState<MoodKey | null>(initialMood);
  const [changing, setChanging] = useState(initialMood === null);
  const [intensity, setIntensity] = useState<number | null>(null);
  const [triggers, setTriggers] = useState<TriggerKey[]>([]);
  const [note, setNote] = useState("");
  const [more, setMore] = useState(false);
  const [activity, setActivity] = useState<ActivityKey | null>(null);
  const [song, setSong] = useState<Song | null>(null);

  const [stage, setStage] = useState<Stage>("form");
  const [saved, setSaved] = useState<{ entry: Entry; risk: Risk; chosen: TriggerKey[] } | null>(null);
  const [running, setRunning] = useState<CareAction | null>(null);
  const [lastRun, setLastRun] = useState<{ action: CareAction; result: RunResult } | null>(null);
  const [savedIv, setSavedIv] = useState<string | null>(null);
  const [showOthers, setShowOthers] = useState(false);

  const understanding = useMemo(
    () =>
      saved ? understandEntry(saved.entry, loadEntries().filter((e) => e.id !== saved.entry.id), saved.chosen) : null,
    [saved],
  );
  const rec = useMemo(
    () =>
      saved
        ? buildRecommendation(
            saved.entry,
            loadEntries().filter((e) => e.id !== saved.entry.id),
            loadInterventions(),
          )
        : null,
    [saved],
  );

  const save = () => {
    if (!mood || intensity === null) return;
    const chosen = triggers;
    const entry = addEntry({ mood, intensity, note, triggers: chosen, activity, song });
    const risk = assessRisk({ valence: moodOf(mood).valence, intensity, note });
    setSaved({ entry, risk, chosen });
    setStage("result");
  };

  const onRunClose = (result: RunResult) => {
    const action = running;
    setRunning(null);
    if (!action) return;
    // 做了至少 20 秒，或者完整做完，才请用户反馈；太短的尝试不打扰
    if (result.completed || result.elapsed >= 20) {
      setLastRun({ action, result });
      setSavedIv(null);
      setStage("feedback");
    }
  };

  const onPick = (after: number) => {
    if (!saved || !lastRun) return;
    if (savedIv) {
      setAfterScore(savedIv, after);
      return;
    }
    const iv = addIntervention({
      intervention_type: lastRun.action.kind,
      intervention_name: lastRun.action.title,
      before_score: saved.entry.intensity,
      after_score: after,
      duration: lastRun.result.elapsed,
      linked_mood_record_id: saved.entry.id,
    });
    setSavedIv(iv.id);
  };

  /* ---------------- 表单 ---------------- */
  if (stage === "form") {
    const m = mood ? moodOf(mood) : null;
    return (
      <div className="pb-1">
        {changing || !m ? (
          <>
            <h2 className="pr-10 font-display text-xl font-semibold">今天感觉怎么样？</h2>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {MOODS.map((x) => (
                <button
                  key={x.key}
                  onClick={() => {
                    setMood(x.key);
                    setChanging(false);
                  }}
                  aria-pressed={mood === x.key}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-2xl border px-1 py-2.5 transition-colors",
                    mood === x.key ? "border-primary bg-primary-soft/60" : "border-border hover:bg-secondary",
                  )}
                >
                  <span className="text-2xl">{x.emoji}</span>
                  <span className="whitespace-nowrap text-xs">{x.label}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 pr-10">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-3xl"
              style={{ backgroundColor: `color-mix(in oklab, ${m.color} 28%, white)` }}
            >
              {m.emoji}
            </span>
            <div>
              <p className="text-xs text-muted-foreground">当前情绪</p>
              <p className="font-display text-xl font-semibold">{m.label}</p>
            </div>
            <button
              onClick={() => setChanging(true)}
              className="ml-auto text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              换一个
            </button>
          </div>
        )}

        {m && (
          <div className="mt-6 space-y-6">
            <div>
              <p className="text-sm font-medium">这种感觉有多强烈？</p>
              <div className="mt-3">
                <IntensityPicker value={intensity} onChange={setIntensity} label="情绪强度" />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium">
                可能和什么有关？<span className="ml-1 font-normal text-muted-foreground">可多选</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {TRIGGERS.map((t) => {
                  const active = triggers.includes(t.key);
                  return (
                    <button
                      key={t.key}
                      onClick={() =>
                        setTriggers((prev) => (active ? prev.filter((x) => x !== t.key) : [...prev, t.key]))
                      }
                      aria-pressed={active}
                      className={cn(
                        "rounded-full border px-3.5 py-2 text-sm transition-colors",
                        active
                          ? "border-primary/70 bg-primary-soft font-medium text-foreground"
                          : "border-border text-muted-foreground hover:bg-secondary",
                      )}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="sheet-note" className="text-sm font-medium">
                想多说一句吗？
              </label>
              <textarea
                id="sheet-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="例如：明天要汇报，总觉得还有很多没有准备好……"
                className="mt-3 w-full resize-none rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-card"
              />
              <p className="mt-1 text-xs text-muted-foreground">可跳过</p>
            </div>

            <div>
              <button
                onClick={() => setMore((v) => !v)}
                aria-expanded={more}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                更多（可选）：此刻在做什么 · 在听什么
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", more && "rotate-180")} />
              </button>
              {more && (
                <div className="animate-rise mt-3 space-y-4">
                  <div className="flex flex-wrap gap-2" role="group" aria-label="此刻在做什么">
                    {ACTIVITIES.map((a) => {
                      const active = activity === a.key;
                      return (
                        <button
                          key={a.key}
                          onClick={() => setActivity(active ? null : a.key)}
                          aria-pressed={active}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs transition-colors",
                            active
                              ? "border-transparent bg-primary-soft font-medium"
                              : "border-border text-muted-foreground hover:bg-secondary",
                          )}
                        >
                          {a.emoji} {a.label}
                        </button>
                      );
                    })}
                  </div>
                  <SongField onChange={setSong} />
                </div>
              )}
            </div>

            <div className="sticky bottom-0 -mx-5 bg-card px-5 pb-1 pt-2 sm:-mx-7 sm:px-7">
              <button
                onClick={save}
                disabled={intensity === null}
                className="w-full rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)] transition-opacity disabled:opacity-45"
              >
                记录下来
              </button>
              {intensity === null && (
                <p className="mt-1.5 text-center text-xs text-muted-foreground">选一下强度就可以记录了</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!saved) return null;
  const m = moodOf(saved.entry.mood);

  /* ---------------- 反馈 ---------------- */
  if (stage === "feedback" && lastRun) {
    return (
      <FeedbackStep
        moodLabel={m.label}
        before={saved.entry.intensity}
        negative={m.valence < 0}
        actionTitle={lastRun.action.title}
        onPick={onPick}
        onDone={onClose}
      />
    );
  }

  /* ---------------- 结果 ---------------- */
  return (
    <div className="space-y-4 pb-1">
      <p className="flex items-center gap-2 pr-10 text-base font-medium">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-4 w-4" />
        </span>
        已记录
        <span className="text-sm font-normal text-muted-foreground">
          {m.emoji} {m.label} · {saved.entry.intensity}/5
        </span>
      </p>

      {saved.risk === "crisis" ? (
        <>
          <SupportCard
            onBreathe={() => setRunning(ACTIONS.slow)}
            showingOthers={showOthers}
            onToggleOthers={() => setShowOthers((v) => !v)}
          />
          {showOthers && rec && stage !== "rest" && (
            <CareSuggestion rec={rec} onStart={setRunning} onRest={() => setStage("rest")} onMore={onClose} />
          )}
        </>
      ) : (
        understanding && (
          <AiCard title="AI 帮你整理了一下">
            <p className="text-[15px] leading-relaxed">{understanding.text}</p>
            <WhyToggle items={understanding.evidence} />
          </AiCard>
        )
      )}

      {saved.risk !== "crisis" &&
        rec &&
        (stage === "rest" ? null : (
          <CareSuggestion
            rec={rec}
            elevated={saved.risk === "elevated"}
            onStart={setRunning}
            onRest={() => setStage("rest")}
            onMore={onClose}
          />
        ))}

      {stage === "rest" && (
        <div className="animate-rise card-soft px-5 py-6 text-center">
          <p className="font-display text-lg leading-relaxed">好的。你已经把此刻的感受记录下来了，这就足够了。</p>
          <button
            onClick={onClose}
            className="mt-5 w-full rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
          >
            关闭
          </button>
        </div>
      )}

      {running && <ActionRunner action={running} onClose={onRunClose} />}
    </div>
  );
}
