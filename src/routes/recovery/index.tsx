import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Lock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { BottomSheet } from "@/components/bottom-sheet";
import { Placeholder, SectionCard } from "@/components/section";
import { RecoverySetup } from "@/components/recovery/setup";
import { UnsentAnalysis, UnsentEditor } from "@/components/recovery/unsent-editor";
import { useRecovery } from "@/hooks/use-recovery";
import {
  RELATIONSHIP_STATUS,
  clearRecovery,
  newId,
  spaceDays,
  updateRecovery,
  whenText,
  type UnsentMessage,
} from "@/lib/recovery";

export const Route = createFileRoute("/recovery/")({
  head: () => ({
    meta: [
      { title: "恢复空间｜MindCare" },
      { name: "description", content: "没有发送的话、给自己的提醒，都只保存在你的设备上。" },
    ],
  }),
  component: RecoveryPage,
});

function RecoveryPage() {
  const r = useRecovery();
  const [writing, setWriting] = useState(false);
  const [open, setOpen] = useState<UnsentMessage | null>(null);
  const [reminder, setReminder] = useState("");
  const [confirm, setConfirm] = useState(false);

  const urgeOf = (id?: string) => (id ? r.urges.find((u) => u.id === id) : undefined);
  const unsent = [...r.unsent].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div className="space-y-5">
      <header>
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> 今天
        </Link>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">恢复空间</h1>
        <p className="mt-2 text-sm text-muted-foreground">这里的内容只保存在这台设备上，不会发送给任何人。</p>
      </header>

      {!r.ready ? (
        <Placeholder className="h-40 w-full rounded-3xl" />
      ) : !r.enabled ? (
        <section className="warm-card px-5 py-6 sm:px-7">
          <RecoverySetup onDone={() => toast("恢复模式已开启，慢慢来")} />
        </section>
      ) : (
        <>
          {/* ---------- 没有发送的话 ---------- */}
          <SectionCard
            title="没有发送的话"
            desc="想说但没有发送的内容，先放在这里。"
            action={
              <button
                onClick={() => setWriting(true)}
                className="shrink-0 rounded-full border border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-secondary"
              >
                写一段没有发送的话
              </button>
            }
          >
            {unsent.length === 0 ? (
              <p className="text-sm text-muted-foreground">还没有。想联系 TA 的时候，可以先把想说的话写在这里。</p>
            ) : (
              <ul className="divide-y divide-border/70">
                {unsent.map((u) => {
                  const urge = urgeOf(u.urge_id);
                  const before = urge?.urge_before ?? u.urge_score;
                  const after = urge?.urge_after;
                  const emotion = u.emotion ?? u.ai_summary.feelings.slice(0, 2).join("、");
                  return (
                    <li key={u.id}>
                      <button onClick={() => setOpen(u)} className="w-full py-3 text-left">
                        <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-muted-foreground">
                          <span>{whenText(u.created_at)}</span>
                          {before !== undefined && (
                            <span>
                              联系冲动 {before}
                              {after !== undefined ? ` → ${after}` : ""}
                            </span>
                          )}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm leading-relaxed">{u.content}</p>
                        {emotion && <p className="mt-1 text-xs text-muted-foreground">当时的情绪：{emotion}</p>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>

          {/* ---------- 给自己的提醒 ---------- */}
          <SectionCard
            title="给自己的提醒"
            desc="为什么当时想拉开距离？只写你自己的感受。很想联系 TA 的时候，停一下的页面里会轻轻出现一两条。"
          >
            <textarea
              value={reminder}
              onChange={(e) => setReminder(e.target.value)}
              rows={2}
              aria-label="给自己的提醒"
              placeholder="例如：每次冷战以后我都很累。"
              className="w-full resize-none rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:bg-card"
            />
            <button
              disabled={!reminder.trim()}
              onClick={() => {
                const content = reminder.trim();
                updateRecovery((d) => ({
                  ...d,
                  reminders: [...d.reminders, { id: newId("rem"), created_at: new Date().toISOString(), content }],
                }));
                setReminder("");
              }}
              className="mt-2 rounded-full border border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-secondary disabled:opacity-45"
            >
              保存这条提醒
            </button>
            {r.reminders.length > 0 && (
              <ul className="mt-4 space-y-2">
                {r.reminders.map((m) => (
                  <li key={m.id} className="flex items-start justify-between gap-3 rounded-2xl bg-secondary/50 px-4 py-3 text-sm">
                    <span className="leading-relaxed">{m.content}</span>
                    <button
                      aria-label="删除这条提醒"
                      onClick={() => updateRecovery((d) => ({ ...d, reminders: d.reminders.filter((x) => x.id !== m.id) }))}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* ---------- 设置 ---------- */}
          <SectionCard title="恢复模式设置">
            {r.profile && (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">当前状态</dt>
                  <dd>{RELATIONSHIP_STATUS.find((s) => s.key === r.profile!.relationship_status)?.label}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">给自己留出空间的时间</dt>
                  <dd>
                    {r.profile.no_contact_enabled
                      ? `已记录 ${spaceDays(r.profile.no_contact_start_time) ?? 0} 天`
                      : "没有记录"}
                    <button
                      onClick={() =>
                        updateRecovery((d) => ({
                          ...d,
                          profile: d.profile
                            ? d.profile.no_contact_enabled
                              ? { ...d.profile, no_contact_enabled: false }
                              : { ...d.profile, no_contact_enabled: true, no_contact_start_time: new Date().toISOString() }
                            : null,
                        }))
                      }
                      className="ml-2 text-xs text-muted-foreground underline underline-offset-4"
                    >
                      {r.profile.no_contact_enabled ? "不再记录" : "从今天开始记录"}
                    </button>
                  </dd>
                </div>
              </dl>
            )}
            <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" /> 恢复模式的内容不会出现在导出的 CSV 里。
            </p>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-border/70 pt-4 text-sm">
              <button
                onClick={() => updateRecovery((d) => ({ ...d, profile: d.profile ? { ...d.profile, enabled: false } : null }))}
                className="rounded-full border border-border px-4 py-2 transition-colors hover:bg-secondary"
              >
                暂时关闭恢复模式
              </button>
              {!confirm ? (
                <button onClick={() => setConfirm(true)} className="px-2 py-2 text-muted-foreground hover:text-destructive">
                  删除全部恢复模式数据
                </button>
              ) : (
                <span className="flex flex-wrap items-center gap-2" role="alertdialog">
                  <span className="text-xs">没有发送的话、提醒和联系冲动记录都会删除，无法恢复。</span>
                  <button
                    onClick={() => {
                      clearRecovery();
                      setConfirm(false);
                      toast("恢复模式的数据已删除");
                    }}
                    className="rounded-full bg-destructive px-3 py-1.5 text-xs text-destructive-foreground"
                  >
                    确认删除
                  </button>
                  <button onClick={() => setConfirm(false)} className="text-xs underline">
                    取消
                  </button>
                </span>
              )}
            </div>
          </SectionCard>
        </>
      )}

      <BottomSheet open={writing} onClose={() => setWriting(false)} label="写一段没有发送的话">
        {writing && <UnsentEditor onClose={() => setWriting(false)} />}
      </BottomSheet>
      <BottomSheet open={!!open} onClose={() => setOpen(null)} label="没有发送的话">
        {open && (
          <div className="space-y-4 pb-1">
            <p className="pr-10 text-xs text-muted-foreground">{whenText(open.created_at)} · 没有发送</p>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{open.content}</p>
            <UnsentAnalysis summary={open.ai_summary} />
            <button
              onClick={() => {
                updateRecovery((d) => ({ ...d, unsent: d.unsent.filter((x) => x.id !== open.id) }));
                setOpen(null);
              }}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" /> 删除这段话
            </button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
