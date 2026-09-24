import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { useRecordSheet } from "@/components/record-sheet";
import { RecoverySetup } from "@/components/recovery/setup";
import { RecoveryDemo } from "@/components/recovery/recovery-demo";
import { UrgeFlow } from "@/components/recovery/urge-flow";
import { useRecovery } from "@/hooks/use-recovery";
import { SCENARIOS, type Scenario } from "@/lib/scenarios";
import { spaceDays, whenText } from "@/lib/recovery";

const card = "flex flex-col rounded-2xl border border-border bg-card/70 px-4 py-4";
const cta = "inline-flex items-center gap-1 text-sm font-medium text-foreground/80 hover:text-foreground";

/**
 * 今天页的「特别时期」：感情变化 / 工作压力 / 家庭烦恼。
 * 次级入口，视觉上不比「今天感觉怎么样？」更突出；产生的记录统一进入「记录」和「洞察」。
 */
export function SpecialTimes() {
  const { open } = useRecordSheet();
  return (
    <section aria-label="特别时期">
      <h2 className="px-1 text-base font-semibold">特别时期</h2>
      <p className="mt-0.5 px-1 text-sm text-muted-foreground">有些时候，我们需要更具体一点的帮助。</p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <RelationshipCard />
        {(["work", "family"] as const).map((k) => (
          <ScenarioCard key={k} s={SCENARIOS[k]} onStart={() => open(undefined, k)} />
        ))}
      </div>
    </section>
  );
}

function Head({ emoji, title }: { emoji: string; title: string }) {
  return (
    <p className="flex items-center gap-2 text-[15px] font-medium">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-base" aria-hidden>
        {emoji}
      </span>
      {title}
    </p>
  );
}

function ScenarioCard({ s, onStart }: { s: Scenario; onStart: () => void }) {
  return (
    <div className={card} role="group" aria-label={s.title}>
      <Head emoji={s.emoji} title={s.title} />
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
      <button onClick={onStart} className={`${cta} mt-3 self-start`}>
        {s.cta} <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

type Sheet = "setup" | "demo" | "urge" | null;

/** 感情变化：没开启时进入恢复模式；开启后显示一句状态，完整内容在「恢复空间」 */
function RelationshipCard() {
  const r = useRecovery();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  const latest = useMemo(() => [...r.urges].sort((a, b) => b.created_at.localeCompare(a.created_at))[0], [r.urges]);
  const days = r.profile?.no_contact_enabled && now ? spaceDays(r.profile.no_contact_start_time, now) : null;
  // 有需要回去看看的事：10 分钟后再决定到时间了，或者重新联系后还没记下感受
  const pending =
    !!now &&
    (r.urges.some(
      (u) => u.action_taken === "pause" && u.urge_after === undefined && u.revisit_at && new Date(u.revisit_at) <= now,
    ) ||
      r.contacts.some(
        (c) => now.getTime() - new Date(c.created_at).getTime() < 3 * 86_400_000 && (c.feeling_after === undefined || c.triggers.length === 0),
      ));

  return (
    <div className={card} role="group" aria-label="感情变化">
      <Head emoji="💔" title="感情变化" />
      {!r.enabled ? (
        <>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">分手、暂停联系，或总是忍不住想起 TA</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <button onClick={() => setSheet("setup")} className={cta}>
              进入恢复模式 <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => setSheet("demo")} className="text-xs text-muted-foreground underline-offset-4 hover:underline">
              先看看怎么用
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="mt-2 flex-1 space-y-0.5 text-sm text-muted-foreground">
            <p>
              {days === null ? "恢复模式已开启" : days > 0 ? `给自己留出空间 · 第 ${days} 天` : "给自己留出空间 · 从今天开始"}
            </p>
            {latest && now && (
              <p>
                最近一次：{whenText(latest.created_at, now)} · {latest.urge_before}
                {latest.urge_after !== undefined ? ` → ${latest.urge_after}` : ""}
              </p>
            )}
            {pending && <p className="text-foreground/80">· 有一件事等你回来看看</p>}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSheet("urge")}
              className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm transition-colors hover:bg-secondary"
            >
              我现在很想联系 TA
            </button>
            <Link to="/recovery" className={cta}>
              进入恢复模式 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </>
      )}
      <BottomSheet open={!!sheet} onClose={() => setSheet(null)} label="失恋恢复模式">
        {sheet === "setup" && <RecoverySetup onDone={() => setSheet(null)} />}
        {sheet === "demo" && <RecoveryDemo onClose={() => setSheet(null)} onStart={() => setSheet("setup")} />}
        {sheet === "urge" && <UrgeFlow onClose={() => setSheet(null)} />}
      </BottomSheet>
    </div>
  );
}
