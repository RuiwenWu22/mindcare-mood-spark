import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BottomSheet } from "@/components/bottom-sheet";
import { Placeholder } from "@/components/section";
import { RecoverySetup } from "@/components/recovery/setup";
import { UrgeFlow } from "@/components/recovery/urge-flow";
import { UnsentEditor } from "@/components/recovery/unsent-editor";
import { RecoveryDemo } from "@/components/recovery/recovery-demo";
import { useRecovery } from "@/hooks/use-recovery";
import {
  AFTER_CONTACT_FEELINGS,
  URGE_TRIGGERS,
  dayWord,
  newId,
  spaceDays,
  updateRecovery,
  urgeTriggerLabel,
  whenText,
  type ContactEvent,
  type ContactUrge,
  type UrgeTrigger,
} from "@/lib/recovery";
import { recoveryInsight } from "@/lib/recovery-ai";
import { cn } from "@/lib/utils";

type Sheet = { kind: "setup" } | { kind: "demo" } | { kind: "urge"; revisit?: ContactUrge } | { kind: "unsent" } | null;

const chip = (on: boolean) =>
  cn(
    "rounded-full border px-3 py-1.5 text-xs transition-colors",
    on ? "border-primary/70 bg-primary-soft font-medium" : "border-border bg-card text-muted-foreground hover:bg-secondary",
  );

/**
 * 失恋恢复模式的主卡片「给自己留出空间」，放在「恢复空间」页面顶部
 * （今天页的「特别时期 → 感情变化」只显示一句状态）。
 */
export function RecoveryCard({ inHub = false }: { inHub?: boolean }) {
  const r = useRecovery();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const latest = useMemo(() => [...r.urges].sort((a, b) => b.created_at.localeCompare(a.created_at))[0], [r.urges]);
  const insight = useMemo(() => (now ? recoveryInsight(r.urges, now) : null), [r.urges, now]);
  const lastContact = useMemo(
    () => [...r.contacts].sort((a, b) => b.created_at.localeCompare(a.created_at))[0],
    [r.contacts],
  );
  const recentContact =
    lastContact && now && now.getTime() - new Date(lastContact.created_at).getTime() < 3 * 86_400_000 ? lastContact : null;
  const due = now
    ? r.urges.find(
        (u) =>
          u.action_taken === "pause" &&
          u.urge_after === undefined &&
          u.revisit_at &&
          new Date(u.revisit_at).getTime() <= now.getTime() &&
          now.getTime() - new Date(u.created_at).getTime() < 24 * 3_600_000,
      )
    : undefined;

  const sheetEl = (
    <BottomSheet open={!!sheet} onClose={() => setSheet(null)} label="失恋恢复模式">
      {sheet?.kind === "setup" && <RecoverySetup onDone={() => setSheet(null)} />}
      {sheet?.kind === "demo" && (
        <RecoveryDemo
          onClose={() => setSheet(null)}
          {...(!r.enabled ? { onStart: () => setSheet({ kind: "setup" }) } : {})}
        />
      )}
      {sheet?.kind === "urge" && (
        <UrgeFlow onClose={() => setSheet(null)} {...(sheet.revisit ? { revisit: sheet.revisit } : {})} />
      )}
      {sheet?.kind === "unsent" && <UnsentEditor onClose={() => setSheet(null)} />}
    </BottomSheet>
  );

  if (!r.ready || !now) return <Placeholder className="h-32 w-full rounded-3xl" />;

  /* ---------- 还没开启：次级场景卡 ---------- */
  if (!r.enabled || !r.profile) {
    return (
      <section className="warm-card px-5 py-5 sm:px-7" aria-label="失恋恢复模式">
        <p className="font-display text-lg font-semibold">正在经历一段难熬的关系变化？</p>
        <p className="mt-1.5 text-sm leading-relaxed text-foreground/80">
          如果你正在经历分手、暂停联系或反复想联系 TA，可以开启失恋恢复模式。
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            onClick={() => setSheet({ kind: "setup" })}
            className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
          >
            开启失恋恢复模式
          </button>
          <button
            onClick={() => setSheet({ kind: "demo" })}
            className="text-sm text-foreground/75 underline-offset-4 hover:underline"
          >
            先看看怎么用
          </button>
        </div>
        {sheetEl}
      </section>
    );
  }

  /* ---------- 已开启：给自己留出空间 ---------- */
  const days = r.profile.no_contact_enabled ? spaceDays(r.profile.no_contact_start_time, now) : null;
  return (
    <section className="warm-card px-5 py-5 sm:px-7" aria-label="给自己留出空间">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-foreground/80">给自己留出空间</p>
        {!inHub && (
          <span className="flex gap-3 text-xs text-muted-foreground">
            <button onClick={() => setSheet({ kind: "demo" })} className="underline-offset-4 hover:underline">
              看看怎么用
            </button>
            <Link to="/recovery" className="underline-offset-4 hover:underline">
              恢复空间
            </Link>
          </span>
        )}
      </div>

      {days !== null &&
        (days > 0 ? (
          <>
            <p className="mt-2 font-display text-3xl font-semibold">第 {days} 天</p>
            <p className="mt-0.5 text-sm text-muted-foreground">距离上次主动联系已经 {days} 天</p>
          </>
        ) : (
          <>
            <p className="mt-2 font-display text-2xl font-semibold">从今天开始</p>
            <p className="mt-0.5 text-sm text-muted-foreground">给自己留一点空间，慢慢来。</p>
          </>
        ))}

      {recentContact && <ContactNote contact={recentContact} now={now} />}

      {due && (
        <div className="mt-4 rounded-2xl bg-card/80 px-4 py-3.5">
          <p className="text-sm">刚才说 10 分钟后再决定。现在还想联系 TA 吗？</p>
          <button onClick={() => setSheet({ kind: "urge", revisit: due })} className="mt-2 text-sm font-medium underline underline-offset-4">
            看看现在的感受
          </button>
        </div>
      )}

      {(latest || (insight && insight.lines[0])) && (
        <div className="mt-4 space-y-1.5 text-sm">
          {latest && (
            <p className="text-foreground/85">
              <span className="text-muted-foreground">最近一次联系冲动：</span>
              {whenText(latest.created_at, now)} · {latest.urge_before}
              {latest.urge_after !== undefined ? ` → ${latest.urge_after}` : ""}
            </p>
          )}
          {insight?.lines[0] && <p className="text-foreground/85">✨ {insight.lines[0]}</p>}
        </div>
      )}

      <button
        onClick={() => setSheet({ kind: "urge" })}
        className="mt-5 w-full rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)] sm:w-auto sm:px-8"
      >
        我现在很想联系 TA
      </button>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <Link to="/recovery/message" className="text-foreground/80 underline-offset-4 hover:underline">
          TA 给我发消息了
        </Link>
        <button onClick={() => setSheet({ kind: "unsent" })} className="text-foreground/80 underline-offset-4 hover:underline">
          写下没有发送的话
        </button>
        <Link to="/insights" hash="recovery" className="text-foreground/80 underline-offset-4 hover:underline">
          查看恢复轨迹
        </Link>
      </div>
      <ReportContact />
      {sheetEl}
    </section>
  );
}

/** 重新联系了 TA：不清零，不说失败，只是看看当时发生了什么 */
function ContactNote({ contact, now }: { contact: ContactEvent; now: Date }) {
  const [triggers, setTriggers] = useState<UrgeTrigger[]>([]);
  const [feel, setFeel] = useState<string[]>([]);
  const save = (p: Partial<ContactEvent>) =>
    updateRecovery((d) => ({ ...d, contacts: d.contacts.map((c) => (c.id === contact.id ? { ...c, ...p } : c)) }));

  return (
    <div className="mt-4 rounded-2xl bg-card/80 px-4 py-4">
      <p className="text-sm font-medium">{dayWord(contact.created_at, now)}你重新联系了 TA</p>
      <p className="mt-1 text-sm leading-relaxed text-foreground/80">
        不需要把之前的努力清零，我们可以看看当时发生了什么。
      </p>
      {contact.triggers.length === 0 ? (
        <>
          <p className="mt-3 text-xs text-muted-foreground">当时是什么触发了这次联系？</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
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
          {triggers.length > 0 && (
            <button onClick={() => save({ triggers })} className="mt-3 text-sm font-medium underline underline-offset-4">
              记下来
            </button>
          )}
        </>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          当时：{contact.triggers.map((t) => `「${urgeTriggerLabel(t)}」`).join("、")}
        </p>
      )}
      {contact.feeling_after === undefined && (
        <>
          <p className="mt-3 text-xs text-muted-foreground">联系之后，你感觉怎么样？</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {AFTER_CONTACT_FEELINGS.map((f) => {
              const on = feel.includes(f);
              return (
                <button key={f} aria-pressed={on} onClick={() => setFeel((p) => (on ? p.filter((x) => x !== f) : [...p, f]))} className={chip(on)}>
                  {f}
                </button>
              );
            })}
          </div>
          {feel.length > 0 && (
            <button onClick={() => save({ feeling_after: feel })} className="mt-3 text-sm font-medium underline underline-offset-4">
              记下来
            </button>
          )}
        </>
      )}
      {contact.feeling_after && contact.feeling_after.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">联系之后：{contact.feeling_after.join("、")}</p>
      )}
    </div>
  );
}

/** 没经过"我现在很想联系 TA"也联系了：如实记下，同样不算失败 */
function ReportContact() {
  const [confirm, setConfirm] = useState(false);
  if (!confirm) {
    return (
      <button onClick={() => setConfirm(true)} className="mt-4 block text-xs text-muted-foreground underline-offset-4 hover:underline">
        我已经联系了 TA
      </button>
    );
  }
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span>记下这次联系？之后可以看看当时发生了什么。</span>
      <button
        onClick={() => {
          const now = new Date().toISOString();
          updateRecovery((d) => ({
            ...d,
            contacts: [...d.contacts, { id: newId("contact"), created_at: now, triggers: [] }],
            profile: d.profile && d.profile.no_contact_enabled ? { ...d.profile, no_contact_start_time: now } : d.profile,
          }));
          setConfirm(false);
        }}
        className="rounded-full border border-border bg-card px-3 py-1 text-foreground"
      >
        记下
      </button>
      <button onClick={() => setConfirm(false)} className="underline-offset-4 hover:underline">
        取消
      </button>
    </div>
  );
}
