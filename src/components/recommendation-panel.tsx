import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Footprints, Music, Pause, Phone, Play, Wind } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { loadEntries, moodOf, type Entry } from "@/lib/mood";
import { BREATHING_PLANS, buildRecommendation, type BreathingPlan, type CareRecommendation } from "@/lib/care-recs";
import { HOTLINE, type Risk } from "@/lib/safety";
import { AMBIENT_TRACKS, toggleAmbient } from "@/lib/ambient";
import { BreathingSession, type BreathingResult } from "@/components/breathing-session";
import { SupportCard } from "@/components/support-card";
import { FollowUpRating } from "@/components/follow-up-rating";
import { useEntries } from "@/hooks/use-entries";
import { useAmbient } from "@/hooks/use-ambient";

type FollowUpState =
  | { stage: "ask"; label: string }
  | { stage: "done"; label: string; before: number; after: number }
  | null;

/**
 * 记录之后发生的一切：危机支持 → 首选推荐（附理由）→ 调节 → 再评分。
 * 首页记录后和自我关怀页顶部共用这一个流程。
 */
export function RecommendationPanel({
  entry,
  risk,
  heading = "此刻更推荐你",
  showCareLink = true,
}: {
  entry: Entry;
  risk: Risk;
  heading?: string;
  showCareLink?: boolean;
}) {
  const { addFollowUp } = useEntries();
  // 推荐在出现时就定下来：用"这一条之外"的历史学习，之后新增的再评分不会让推荐突然变掉
  const [rec] = useState<CareRecommendation>(() =>
    buildRecommendation(
      entry,
      loadEntries().filter((e) => e.id !== entry.id),
    ),
  );
  const [showOthers, setShowOthers] = useState(false);
  const [breathing, setBreathing] = useState<BreathingPlan | null>(null);
  const [followUp, setFollowUp] = useState<FollowUpState>(null);
  const [resting, setResting] = useState(false);

  const onBreathingClose = (result: BreathingResult) => {
    const plan = breathing;
    setBreathing(null);
    // 练了至少半分钟才请用户再评分，太短的尝试不打扰
    if (plan && (result.completed || result.elapsed >= 30)) {
      setFollowUp({ stage: "ask", label: plan.title });
    }
  };

  const submitFollowUp = (after: number) => {
    if (followUp?.stage !== "ask") return;
    addFollowUp(entry.id, {
      method: "breathing",
      label: followUp.label,
      before: entry.intensity,
      after,
      at: new Date().toISOString(),
    });
    setFollowUp({ stage: "done", label: followUp.label, before: entry.intensity, after });
  };

  const showRec = risk !== "crisis" || showOthers;
  const negative = moodOf(entry.mood).valence < 0;

  return (
    <div>
      {risk === "crisis" && (
        <SupportCard
          onBreathe={() => setBreathing(BREATHING_PLANS["slow"])}
          showingOthers={showOthers}
          onToggleOthers={() => setShowOthers((v) => !v)}
        />
      )}

      {followUp?.stage === "ask" && (
        <FollowUpRating
          moodLabel={moodOf(entry.mood).label}
          before={entry.intensity}
          onSubmit={submitFollowUp}
          onSkip={() => setFollowUp(null)}
        />
      )}

      {followUp?.stage === "done" && <FollowUpResult {...followUp} negative={negative} />}

      {showRec &&
        (resting ? (
          <div className="animate-rise mt-8 rounded-3xl border border-border bg-card px-5 py-6 sm:px-6">
            <p className="font-display text-lg">好的。你已经记录下来了，这就足够了。</p>
            <button
              onClick={() => setResting(false)}
              className="mt-3 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              改变主意了？看看推荐
            </button>
          </div>
        ) : (
          <RecommendationCard
            rec={rec}
            risk={risk}
            heading={heading}
            showCareLink={showCareLink}
            onBreathe={() => setBreathing(rec.breathing)}
            onRest={() => setResting(true)}
          />
        ))}

      {breathing && <BreathingSession plan={breathing} onClose={onBreathingClose} />}
    </div>
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
    message = `从 ${before} 降到了 ${after}。这次${label}对你有帮助，已经记下来了，下次会优先推荐对你有效的方法，也可以在洞察页的「什么对我有效」里看到。`;
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

function MusicButton({ id, label }: { id: CareRecommendation["music"]["id"]; label?: string }) {
  const { playing } = useAmbient();
  const track = AMBIENT_TRACKS[id];
  const isPlaying = playing === id;
  return (
    <button
      onClick={() => {
        const started = toggleAmbient(id);
        if (!started && !isPlaying) toast("当前浏览器暂不支持播放背景声");
      }}
      aria-label={isPlaying ? `停止${track.title}` : `播放${track.title}`}
      className={
        label
          ? "inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5"
          : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:-translate-y-0.5"
      }
    >
      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
      {label && <span>{isPlaying ? "停止播放" : label}</span>}
    </button>
  );
}

function RecommendationCard({
  rec,
  risk,
  heading,
  showCareLink,
  onBreathe,
  onRest,
}: {
  rec: CareRecommendation;
  risk: Risk;
  heading: string;
  showCareLink: boolean;
  onBreathe: () => void;
  onRest: () => void;
}) {
  const [whyOpen, setWhyOpen] = useState(false);
  const track = AMBIENT_TRACKS[rec.music.id];

  return (
    <div className="animate-rise mt-8 rounded-3xl border border-border bg-primary-soft/60 px-5 py-6 sm:px-6">
      <h3 className="font-display text-lg font-semibold">{heading}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{rec.intro}</p>

      {/* 首选 */}
      <div className="mt-5 rounded-2xl bg-card px-5 py-5 shadow-[var(--shadow-soft)]">
        {rec.primary === "breathing" ? (
          <>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Wind className="h-4 w-4" /> 首选 · 呼吸练习
            </div>
            <p className="mt-2 font-display text-lg font-semibold">{rec.breathing.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{rec.breathing.rhythm}</p>
            <button
              onClick={onBreathe}
              className="mt-4 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              开始 2 分钟呼吸练习
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Music className="h-4 w-4" /> 首选 · 放松背景声
            </div>
            <p className="mt-2 font-display text-lg font-semibold">
              {track.emoji} {track.title}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{rec.music.reason}</p>
            <div className="mt-4">
              <MusicButton id={rec.music.id} label={`播放${track.title}`} />
            </div>
          </>
        )}

        <button
          onClick={() => setWhyOpen((v) => !v)}
          aria-expanded={whyOpen}
          className="mt-4 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          为什么推荐这个？
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${whyOpen ? "rotate-180" : ""}`} />
        </button>
        {whyOpen && (
          <ul className="mt-2 space-y-1.5 border-l-2 border-primary/40 pl-3 text-xs leading-relaxed text-foreground/80">
            {rec.why.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}
      </div>

      {/* 备选 */}
      <p className="mt-5 text-xs text-muted-foreground">不想做这个？换一种方式</p>
      <div className="mt-2 space-y-2.5">
        {rec.primary === "breathing" ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-card/85 px-4 py-3.5">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Music className="h-4 w-4 text-muted-foreground" /> {track.emoji} {track.title}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{rec.music.reason}</p>
            </div>
            <MusicButton id={rec.music.id} />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-card/85 px-4 py-3.5">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Wind className="h-4 w-4 text-muted-foreground" /> {rec.breathing.title}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{rec.breathing.rhythm}</p>
            </div>
            <button
              onClick={onBreathe}
              aria-label={`开始${rec.breathing.title}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-secondary"
            >
              <Play className="ml-0.5 h-4 w-4" />
            </button>
          </div>
        )}
        <div className="rounded-2xl bg-card/85 px-4 py-3.5">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <Footprints className="h-4 w-4 text-muted-foreground" /> {rec.move.title}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{rec.move.desc}</p>
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
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <button onClick={onRest} className="underline underline-offset-4 hover:text-foreground">
          现在什么都不想做
        </button>
        {showCareLink && (
          <Link to="/care" className="underline underline-offset-4 hover:text-foreground">
            去自我关怀页看更多
          </Link>
        )}
      </div>
    </div>
  );
}
