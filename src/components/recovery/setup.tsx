import { useState } from "react";
import { RELATIONSHIP_STATUS, updateRecovery, type RelationshipStatus } from "@/lib/recovery";
import { dayKey } from "@/lib/mood";
import { cn } from "@/lib/utils";

/** 开启失恋恢复模式：不需要填写对方的名字 */
export function RecoverySetup({ onDone }: { onDone: () => void }) {
  const [status, setStatus] = useState<RelationshipStatus | null>(null);
  const [track, setTrack] = useState(false);
  const today = dayKey();
  const [since, setSince] = useState(today);

  const save = () => {
    if (!status) return;
    const now = new Date();
    // 选了以前的日期时，从那天开始算；今天则从现在开始
    const start = since === today ? now : new Date(`${since}T12:00:00`);
    updateRecovery((d) => ({
      ...d,
      profile: {
        enabled: true,
        relationship_status: status,
        no_contact_enabled: track,
        ...(track ? { no_contact_start_time: start.toISOString() } : {}),
        enabled_at: d.profile?.enabled_at ?? now.toISOString(),
      },
    }));
    onDone();
  };

  return (
    <div className="pb-1">
      <h2 className="pr-10 font-display text-xl font-semibold">给自己一点恢复的空间</h2>
      <p className="mt-2 text-sm leading-relaxed text-foreground/80">
        这个模式可以帮助你记录联系冲动、保存没有发送的话，并慢慢发现哪些时刻最容易触发情绪。
      </p>

      <p className="mt-6 text-sm font-medium">当前状态</p>
      <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="当前状态">
        {RELATIONSHIP_STATUS.map((s) => (
          <button
            key={s.key}
            role="radio"
            aria-checked={status === s.key}
            onClick={() => setStatus(s.key)}
            className={cn(
              "rounded-full border px-3.5 py-2 text-sm transition-colors",
              status === s.key ? "border-primary/70 bg-primary-soft font-medium" : "border-border text-muted-foreground hover:bg-secondary",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-2xl bg-secondary/50 px-4 py-4">
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm">
            记录给自己留出空间的时间
            <span className="mt-0.5 block text-xs text-muted-foreground">显示距离上次主动联系过了几天，只是记录，不是打卡。</span>
          </span>
          <button
            role="switch"
            aria-checked={track}
            aria-label="记录给自己留出空间的时间"
            onClick={() => setTrack((v) => !v)}
            className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", track ? "bg-primary" : "bg-foreground/20")}
          >
            <span
              className={cn(
                "absolute top-1 h-5 w-5 rounded-full bg-card shadow transition-all",
                track ? "left-6" : "left-1",
              )}
            />
          </button>
        </label>
        {track && (
          <label className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
            上次主动联系 TA 是哪天？
            <input
              type="date"
              value={since}
              max={today}
              onChange={(e) => setSince(e.target.value || today)}
              className="rounded-lg border border-border bg-card px-2 py-1 text-sm"
            />
          </label>
        )}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">不需要填写对方的名字。所有内容只保存在这台设备上，不会自动发送给任何人。</p>

      <button
        onClick={save}
        disabled={!status}
        className="mt-6 w-full rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)] disabled:opacity-45"
      >
        开启恢复模式
      </button>
    </div>
  );
}
