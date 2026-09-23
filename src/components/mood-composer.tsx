import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Footprints, Music, Pause, Phone, Play, Wind } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { MOODS, TRIGGERS, moodOf, type MoodKey, type TriggerKey } from "@/lib/mood";
import {
  BREATHING_PLANS,
  recommendFor,
  type BreathingPlan,
  type CareRecommendation,
} from "@/lib/care-recs";
import { assessRisk, HOTLINE, type Risk } from "@/lib/safety";
import { AMBIENT_TRACKS, toggleAmbient } from "@/lib/ambient";
import { BreathingSession, type BreathingResult } from "@/components/breathing-session";
import { SupportCard } from "@/components/support-card";
import { FollowUpRating } from "@/components/follow-up-rating";
import { useEntries } from "@/hooks/use-entries";
import { useAmbient } from "@/hooks/use-ambient";
import { cn } from "@/lib/utils";

type Saved = {
  entryId: string;
  mood: MoodKey;
  before: number;
  rec: CareRecommendation;
  risk: Risk;
};

type FollowUpState =
  | { stage: "ask"; label: string }
  | { stage: "done"; label: string; before: number; after: number }
  | null;

export function MoodComposer({ title = "你现在感觉怎么样？" }: { title?: string }) {
  const { addEntry, addFollowUp } = useEntries();
  const [mood, setMood] = useState<MoodKey | null>(null);
  const [intensity, setIntensity] = useState(5);
  const [note, setNote] = useState("");
  const [triggers, setTriggers] = useState<TriggerKey[]>([]);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [showOthers, setShowOthers] = useState(false);
  const [breathing, setBreathing] = useState<BreathingPlan | null>(null);
  const [followUp, setFollowUp] = useState<FollowUpState>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (saved) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [saved]);

  const toggleTrigger = (key: TriggerKey) =>
    setTriggers((prev) => (prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]));

  const save = () => {
    if (!mood) {
      toast("先选一个此刻最接近的情绪吧");
      return;
    }
    const entry = addEntry({ mood, intensity, note, triggers });
    const risk = assessRisk({ valence: moodOf(mood).valence, intensity, note });
    setSaved({ entryId: entry.id, mood, before: intensity, rec: recommendFor(mood, intensity), risk });
    setShowOthers(false);
    setFollowUp(null);
    setMood(null);
    setIntensity(5);
    setNote("");
    setTriggers([]);
    if (risk === "crisis") {
      toast("这条记录已经保存");
    } else {
      toast.success("今天的情绪已经被好好记录了 🌿", {
        description: "可以到「情绪日记」里回顾它。",
      });
    }
  };

  const onBreathingClose = (result: BreathingResult) => {
    const plan = breathing;
    setBreathing(null);
    // 练了至少半分钟才请用户再评分，太短的尝试不打扰
    if (saved && plan && (result.completed || result.elapsed >= 30)) {
      setFollowUp({ stage: "ask", label: plan.title });
    }
  };

  const submitFollowUp = (after: number) => {
    if (!saved || followUp?.stage !== "ask") return;
    addFollowUp(saved.entryId, {
      method: "breathing",
      label: followUp.label,
      before: saved.before,
      after,
      at: new Date().toISOString(),
    });
    setFollowUp({ stage: "done", label: followUp.label, before: saved.before, after });
  };

  const showRec = saved && (saved.risk !== "crisis" || showOthers);

  return (
    <section className="card-soft animate-rise px-6 py-7 sm:px-8">
      <h2 className="font-display text-xl font-semibold sm:text-2xl">{title}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">选一个最接近的就好，不用很准确。</p>

      <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {MOODS.map((m) => {
          const active = mood === m.key;
          return (
            <button
              key={m.key}
              onClick={() => setMood(m.key)}
              aria-pressed={active}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-2xl border px-3 py-4 transition-all",
                active
                  ? "border-transparent shadow-[var(--shadow-soft)] ring-2 ring-primary"
                  : "border-border bg-secondary/40 hover:-translate-y-0.5 hover:bg-secondary",
              )}
              style={active ? { backgroundColor: `color-mix(in oklab, ${m.color} 28%, white)` } : undefined}
            >
              <span className="text-2xl">{m.emoji}</span>
              <span className="text-sm">{m.label}</span>
            </button>
          );
        })}
      </div>

      {mood && (
        <div className="animate-rise mt-7 space-y-6">
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="intensity" className="text-sm font-medium">
                情绪强度
              </label>
              <span className="font-display text-lg">{intensity} / 10</span>
            </div>
            <input
              id="intensity"
              type="range"
              min={1}
              max={10}
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-[var(--primary)]"
            />
            <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
              <span>很轻微</span>
              <span>非常强烈</span>
            </div>
          </div>

          <div>
            <span className="text-sm font-medium">和什么有关？（可多选）</span>
            <div className="mt-3 flex flex-wrap gap-2">
              {TRIGGERS.map((t) => {
                const active = triggers.includes(t.key);
                return (
                  <button
                    key={t.key}
                    onClick={() => toggleTrigger(t.key)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                      active
                        ? "border-transparent bg-primary-soft font-medium text-foreground"
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
            <label htmlFor="note" className="text-sm font-medium">
              想多说一句吗？（选填）
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="发生了什么？写下此刻的感受……不写也没关系。"
              className="mt-3 w-full resize-none rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-card"
            />
          </div>
        </div>
      )}

      <button
        onClick={save}
        className="mt-7 w-full rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:opacity-95 sm:w-auto sm:px-10"
      >
        保存今天的情绪
      </button>

      <div ref={resultRef}>
        {saved?.risk === "crisis" && (
          <SupportCard
            onBreathe={() => setBreathing(BREATHING_PLANS["slow"]!)}
            showingOthers={showOthers}
            onToggleOthers={() => setShowOthers((v) => !v)}
          />
        )}

        {saved && followUp?.stage === "ask" && (
          <FollowUpRating
            moodLabel={moodOf(saved.mood).label}
            before={saved.before}
            onSubmit={submitFollowUp}
            onSkip={() => setFollowUp(null)}
          />
        )}

        {saved && followUp?.stage === "done" && (
          <FollowUpResult
            {...followUp}
            negative={moodOf(saved.mood).valence < 0}
          />
        )}

        {showRec && saved && (
          <RecommendationCard
            rec={saved.rec}
            risk={saved.risk}
            onBreathe={() => setBreathing(saved.rec.breathing)}
          />
        )}
      </div>

      {breathing && <BreathingSession plan={breathing} onClose={onBreathingClose} />}
    </section>
  );
}

function FollowUpResult({
  label,
  before,
  after,
  negative,
}: {
  label: string;
  before: number;
  after: number;
  negative: boolean;
}) {
  const diff = before - after;
  // 对正向情绪（开心、平静），强度下降不代表"变好"，文案保持中性
  let message: string;
  if (!negative) {
    message = `记下了：${before} → ${after}。留意是什么让此刻的感受发生了变化。`;
  } else if (diff > 0) {
    message = `从 ${before} 降到了 ${after}。这次${label}对你有帮助，已经记在这条记录里，可以在「情绪日记」里回看。`;
  } else if (diff === 0) {
    message = "强度没有明显变化，这也很正常，有时身体需要多一点时间。也可以试试下面的背景声，或者起来动一动。";
  } else {
    message = "感受好像更强烈了。没关系，不是每种方法都适合每个时刻，可以换一种方式，或者先好好休息一下。";
  }

  return (
    <div className="animate-rise mt-8 rounded-3xl border border-border bg-primary-soft/60 px-5 py-5 sm:px-6">
      <p className="text-sm font-medium">
        {label} · {before} → {after}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">{message}</p>
      {negative && after >= 9 && (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          如果这种感受一直很强烈，可以拨打
          <a href={`tel:${HOTLINE.number}`} className="mx-1 font-medium text-foreground underline underline-offset-2">
            {HOTLINE.number}
          </a>
          {HOTLINE.name}，和专业的人聊一聊。
        </p>
      )}
    </div>
  );
}

function RecommendationCard({
  rec,
  risk,
  onBreathe,
}: {
  rec: CareRecommendation;
  risk: Risk;
  onBreathe: () => void;
}) {
  const { playing } = useAmbient();
  const track = AMBIENT_TRACKS[rec.music.id];
  const isPlaying = playing === track.id;

  return (
    <div className="animate-rise mt-8 rounded-3xl border border-border bg-primary-soft/60 px-5 py-6 sm:px-6">
      <h3 className="font-display text-lg font-semibold">为你推荐的几件小事</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{rec.intro}</p>

      <div className="mt-5 space-y-3">
        <div className="rounded-2xl bg-card/85 px-4 py-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Wind className="h-4 w-4" /> 呼吸练习
          </div>
          <p className="mt-2 text-sm font-medium">{rec.breathing.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{rec.breathing.rhythm}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{rec.breathing.desc}</p>
          <button
            onClick={onBreathe}
            className="mt-3 rounded-full bg-primary px-5 py-2 text-xs font-medium text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            开始 2 分钟呼吸练习
          </button>
        </div>

        <div className="rounded-2xl bg-card/85 px-4 py-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Music className="h-4 w-4" /> 放松背景声
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {track.emoji} {track.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{rec.music.reason}</p>
            </div>
            <button
              onClick={() => {
                const started = toggleAmbient(track.id);
                if (!started && !isPlaying) toast("当前浏览器暂不支持播放背景声");
              }}
              aria-label={isPlaying ? `停止${track.title}` : `播放${track.title}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-card/85 px-4 py-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Footprints className="h-4 w-4" /> 轻运动
          </div>
          <p className="mt-2 text-sm font-medium">{rec.move.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{rec.move.desc}</p>
        </div>
      </div>

      {risk === "elevated" && (
        <div className="mt-4 flex gap-2.5 rounded-2xl border border-border bg-card/85 px-4 py-3.5 text-xs leading-relaxed text-foreground/80">
          <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span>
            这次的感受很强烈。如果它持续很久，或者让你难以承受，可以拨打
            <a href={`tel:${HOTLINE.number}`} className="mx-1 font-medium text-foreground underline underline-offset-2">
              {HOTLINE.number}
            </a>
            {HOTLINE.name}，和专业的人聊一聊。
          </span>
        </div>
      )}

      <p className="mt-4 text-xs leading-relaxed text-foreground/75">🌱 {rec.encouragement}</p>
      <Link
        to="/care"
        className="mt-4 inline-flex text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        去自我关怀页看更多
      </Link>
    </div>
  );
}
