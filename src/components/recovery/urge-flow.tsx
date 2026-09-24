import { useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { AiCard, WhyToggle } from "@/components/ai-card";
import { IntensityPicker } from "@/components/intensity-picker";
import { SupportCard } from "@/components/support-card";
import { useRecovery } from "@/hooks/use-recovery";
import { hasCrisisSignal } from "@/lib/safety";
import {
  DESIRES,
  URGE_TRIGGERS,
  newId,
  updateRecovery,
  type ContactUrge,
  type Desire,
  type UrgeTrigger,
} from "@/lib/recovery";
import { afterPauseText, analyzeUnsent, pauseCard } from "@/lib/recovery-ai";
import { cn } from "@/lib/utils";

type Stage = "urge" | "trigger" | "text" | "desire" | "card" | "contacted" | "pause" | "rate";

const chip = (active: boolean) =>
  cn(
    "rounded-full border px-3.5 py-2 text-sm transition-colors",
    active ? "border-primary/70 bg-primary-soft font-medium text-foreground" : "border-border text-muted-foreground hover:bg-secondary",
  );
const primary =
  "w-full rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)] transition-opacity disabled:opacity-45";

/**
 * 「我现在很想联系 TA」：记录冲动 → 触发 → 想说的话 → 真实需要 → ✨ 先帮你停一下 → 自己决定。
 * 不进入聊天机器人，也不阻止用户联系。
 */
export function UrgeFlow({
  onClose,
  presetTriggers = [],
  revisit,
}: {
  onClose: () => void;
  /** 例如从"TA 给我发消息了"进入时，预先选上"收到 TA 的消息" */
  presetTriggers?: UrgeTrigger[];
  /** 10 分钟后回来：直接进入再次评分 */
  revisit?: ContactUrge;
}) {
  const { reminders } = useRecovery();
  const [stage, setStage] = useState<Stage>(revisit ? "rate" : "urge");
  const [urge, setUrge] = useState<number | null>(revisit?.urge_before ?? null);
  const [triggers, setTriggers] = useState<UrgeTrigger[]>(presetTriggers);
  const [text, setText] = useState("");
  const [desire, setDesire] = useState<Desire | null>(null);
  const [id, setId] = useState<string | null>(revisit?.id ?? null);
  const [mode, setMode] = useState<"save" | "pause">("save");
  const [after, setAfter] = useState<number | null>(null);

  const card = useMemo(
    () => (urge ? pauseCard({ urge, triggers, text, ...(desire ? { desire } : {}) }) : null),
    [urge, triggers, text, desire],
  );
  const crisis = hasCrisisSignal(text);

  const patch = (p: Partial<ContactUrge>) =>
    id && updateRecovery((d) => ({ ...d, urges: d.urges.map((u) => (u.id === id ? { ...u, ...p } : u)) }));

  /** 到 AI 卡片时先存下来，之后的选择再更新同一条 */
  const toCard = () => {
    if (!urge) return;
    const nid = newId("urge");
    const item: ContactUrge = {
      id: nid,
      created_at: new Date().toISOString(),
      urge_before: urge,
      triggers,
      unsent_text: text.trim(),
      ...(desire ? { desired_response: desire } : {}),
      action_taken: "none",
    };
    updateRecovery((d) => ({ ...d, urges: [...d.urges, item] }));
    setId(nid);
    setStage("card");
  };

  const saveUnsent = () => {
    if (!text.trim() || !id || !urge) return;
    updateRecovery((d) => ({
      ...d,
      unsent: [
        ...d.unsent,
        {
          id: newId("unsent"),
          created_at: new Date().toISOString(),
          content: text.trim(),
          urge_score: urge,
          urge_id: id,
          ai_summary: analyzeUnsent(text, desire ?? undefined),
        },
      ],
    }));
  };

  const choose = (action: "save" | "pause" | "contact") => {
    if (action === "contact") {
      patch({ action_taken: "contact" });
      updateRecovery((d) => ({
        ...d,
        contacts: [...d.contacts, { id: newId("contact"), created_at: new Date().toISOString(), triggers, ...(id ? { urge_id: id } : {}) }],
        // 重新计算留出空间的时间，但不会在界面上表达成失败或清零
        profile:
          d.profile && d.profile.no_contact_enabled ? { ...d.profile, no_contact_start_time: new Date().toISOString() } : d.profile,
      }));
      setStage("contacted");
      return;
    }
    saveUnsent();
    setMode(action);
    patch(
      action === "pause"
        ? { action_taken: "pause", revisit_at: new Date(Date.now() + 10 * 60_000).toISOString() }
        : { action_taken: "save" },
    );
    setStage("pause");
  };

  const steps: Stage[] = ["urge", "trigger", "text", "desire"];
  const stepNo = steps.indexOf(stage);
  const back = stepNo > 0 ? () => setStage(steps[stepNo - 1]!) : undefined;

  /* ---------- Step 1–4 ---------- */
  if (stepNo >= 0) {
    return (
      <div className="pb-1">
        <div className="flex items-center gap-3 pr-10 text-xs text-muted-foreground">
          {back ? (
            <button onClick={back} className="hover:text-foreground">
              ← 上一步
            </button>
          ) : (
            <span>先停一下</span>
          )}
          <span className="ml-auto">第 {stepNo + 1} / 4 步</span>
        </div>
        <div className="mt-2 flex gap-1" aria-hidden>
          {steps.map((s, i) => (
            <span key={s} className={cn("h-1 flex-1 rounded-full", i <= stepNo ? "bg-primary/70" : "bg-secondary")} />
          ))}
        </div>

        {stage === "urge" && (
          <div className="mt-6">
            <h2 className="font-display text-xl font-semibold">现在有多想联系 TA？</h2>
            <div className="mt-5">
              <IntensityPicker value={urge} onChange={setUrge} label="联系冲动" low="有一点想" high="非常想" />
            </div>
            <button onClick={() => setStage("trigger")} disabled={!urge} className={cn(primary, "mt-8")}>
              下一步
            </button>
          </div>
        )}

        {stage === "trigger" && (
          <div className="mt-6">
            <h2 className="font-display text-xl font-semibold">刚刚发生了什么？</h2>
            <p className="mt-1 text-sm text-muted-foreground">可多选</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {URGE_TRIGGERS.map((t) => {
                const on = triggers.includes(t.key);
                return (
                  <button
                    key={t.key}
                    aria-pressed={on}
                    onClick={() => setTriggers((p) => (on ? p.filter((x) => x !== t.key) : [...p, t.key]))}
                    className={chip(on)}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setStage("text")} className={cn(primary, "mt-8")}>
              下一步
            </button>
          </div>
        )}

        {stage === "text" && (
          <div className="mt-6">
            <h2 className="font-display text-xl font-semibold">你现在最想对 TA 说什么？</h2>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              aria-label="你现在最想对 TA 说什么"
              placeholder="把想说的话先留在这里，不需要马上决定要不要发送。"
              className="mt-4 w-full resize-none rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground focus:border-primary focus:bg-card"
            />
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" /> 这段内容不会被发送给任何人。
            </p>
            <button onClick={() => setStage("desire")} className={cn(primary, "mt-6")}>
              {text.trim() ? "下一步" : "先跳过"}
            </button>
          </div>
        )}

        {stage === "desire" && (
          <div className="mt-6">
            <h2 className="font-display text-xl font-semibold">如果 TA 回复了，你最希望得到什么？</h2>
            <div className="mt-4 grid gap-2" role="radiogroup" aria-label="最希望得到什么">
              {DESIRES.map((d) => (
                <button
                  key={d.key}
                  role="radio"
                  aria-checked={desire === d.key}
                  onClick={() => setDesire(d.key)}
                  className={cn(chip(desire === d.key), "rounded-2xl text-left")}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <button onClick={toCard} disabled={!desire} className={cn(primary, "mt-6")}>
              下一步
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ---------- ✨ 先帮你停一下 + 三个选择 ---------- */
  if (stage === "card" && card) {
    return (
      <div className="space-y-4 pb-1">
        {crisis ? (
          <SupportCard onBreathe={() => choose("save")} />
        ) : (
          <AiCard title="先帮你停一下">
            <div className="space-y-1.5 text-[15px] leading-relaxed">
              {card.lines.map((l) => (
                <p key={l}>{l}</p>
              ))}
            </div>
            <WhyToggle items={card.evidence} />
          </AiCard>
        )}
        <div className="space-y-2.5">
          <button onClick={() => choose("save")} className={primary}>
            先保存，不发送
          </button>
          <button
            onClick={() => choose("pause")}
            className="w-full rounded-full border border-border px-6 py-3 text-sm transition-colors hover:bg-secondary"
          >
            10 分钟后再决定
          </button>
          <button onClick={() => choose("contact")} className="w-full py-2 text-sm text-muted-foreground underline-offset-4 hover:underline">
            我还是决定联系
          </button>
        </div>
        <p className="text-center text-xs text-muted-foreground">不管选哪一个都可以，这里只是帮你先停一下。</p>
      </div>
    );
  }

  /* ---------- 我还是决定联系 ---------- */
  if (stage === "contacted") {
    return (
      <div className="py-2 text-center">
        <p className="font-display text-xl font-semibold">好的。这个决定由你来做。</p>
        <p className="mt-3 text-sm leading-relaxed text-foreground/85">联系之后，你愿意回来记录一下自己的感受吗？</p>
        <button onClick={onClose} className={cn(primary, "mt-6")}>
          好，之后回来记录
        </button>
        <button
          onClick={() => {
            updateRecovery((d) => ({
              ...d,
              contacts: d.contacts.map((c) => (c.urge_id === id ? { ...c, feeling_after: [] } : c)),
            }));
            onClose();
          }}
          className="mt-2 w-full py-2 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          不用了
        </button>
      </div>
    );
  }

  /* ---------- Pause ---------- */
  if (stage === "pause") {
    return (
      <PauseView
        showReminders={(urge ?? 0) >= 4}
        reminders={reminders.map((r) => r.content)}
        later={mode === "pause"}
        onDone={() => setStage("rate")}
        onLater={onClose}
      />
    );
  }

  /* ---------- 再次评分 ---------- */
  const before = urge ?? 0;
  return (
    <div className="pb-1">
      <h2 className="pr-10 font-display text-xl font-semibold">现在还想联系 TA 吗？</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">刚才是 {before} / 5。</p>
      <div className="mt-5">
        <IntensityPicker
          value={after}
          highlight={before}
          label="现在的联系冲动"
          low="有一点想"
          high="非常想"
          onChange={(n) => {
            setAfter(n);
            patch({ urge_after: n });
          }}
        />
      </div>
      {after !== null && (
        <div className="animate-rise mt-6 text-center">
          <p className="font-display text-4xl font-semibold tabular-nums">
            {before} → {after}
          </p>
          <p className="mt-2 text-sm text-foreground/85">{afterPauseText(before, after)}</p>
          <p className="mt-1 text-xs text-muted-foreground">已记下，会出现在洞察的「最近的恢复轨迹」里。</p>
          <button onClick={onClose} className={cn(primary, "mt-5")}>
            完成
          </button>
        </div>
      )}
    </div>
  );
}

/** 很轻量的停顿：30 秒呼吸，不锁定页面，随时可以结束 */
function PauseView({
  showReminders,
  reminders,
  later,
  onDone,
  onLater,
}: {
  showReminders: boolean;
  reminders: string[];
  later: boolean;
  onDone: () => void;
  onLater: () => void;
}) {
  const [left, setLeft] = useState(30);
  const [picked] = useState(() => [...reminders].sort(() => Math.random() - 0.5).slice(0, 2));
  useEffect(() => {
    if (left <= 0) return;
    const t = window.setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => window.clearTimeout(t);
  }, [left]);

  return (
    <div className="pb-1 text-center">
      <p className="pr-2 text-sm text-muted-foreground">{later ? "10 分钟后再决定" : "已保存，没有发送"}</p>
      <div className="mx-auto mt-6 flex h-44 w-44 items-center justify-center">
        <div className="animate-pause-breathe flex h-44 w-44 items-center justify-center rounded-full bg-primary-soft">
          <span className="font-display text-3xl font-light tabular-nums" aria-live="off">
            {left > 0 ? left : "✓"}
          </span>
        </div>
      </div>
      <p className="mt-6 font-display text-lg leading-relaxed">暂时不用解决任何事情，先让这一分钟过去。</p>
      <p className="mt-1 text-xs text-muted-foreground">跟着圆圈慢慢吸气、慢慢呼气。</p>

      {showReminders && picked.length > 0 && (
        <div className="mt-6 rounded-2xl bg-secondary/60 px-4 py-4 text-left">
          <p className="text-xs text-muted-foreground">你之前留给自己的提醒</p>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed">
            {picked.map((r) => (
              <li key={r}>“{r}”</li>
            ))}
          </ul>
        </div>
      )}

      <button onClick={onDone} className={cn(primary, "mt-6")}>
        {left > 0 ? "我好一点了" : "好了"}
      </button>
      {later && (
        <button onClick={onLater} className="mt-2 w-full py-2 text-sm text-muted-foreground underline-offset-4 hover:underline">
          10 分钟后再回来看看
        </button>
      )}
    </div>
  );
}
