import { Link } from "@tanstack/react-router";
import { moodOf, triggerLabel, type Entry, type TriggerKey } from "@/lib/mood";
import { eventOf } from "@/lib/scenarios";
import { urgeTriggerLabel, whenText, type ContactUrge } from "@/lib/recovery";

type Row = { label: string; count: number };

const tally = (labels: string[]): Row[] => {
  const m = new Map<string, number>();
  labels.forEach((l) => m.set(l, (m.get(l) ?? 0) + 1));
  return [...m.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
};

function Rows({ title, rows }: { title: string; rows: Row[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div>
      <p className="text-xs text-muted-foreground">{title}</p>
      <ul className="mt-2 space-y-2">
        {rows.map((r) => (
          <li key={r.label} className="text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span>{r.label}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{r.count} 次</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary/60" style={{ width: `${(r.count / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * 洞察 → 触发因素的细分：比如「工作 → 方案被否 3 次」。
 * 工作 / 家庭按特别时期里选的事情细分；感情另外统计联系冲动的触发时刻。
 */
export function TriggerDrill({
  triggerKey,
  entries,
  urges,
  demo,
  onClose,
}: {
  triggerKey: string;
  entries: Entry[];
  urges: ContactUrge[];
  demo: boolean;
  onClose: () => void;
}) {
  const list = entries
    .filter((e) => e.triggers.includes(triggerKey as TriggerKey))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const events = tally(
    list.flatMap((e) => {
      const ev = eventOf(e.record_type, e.event);
      return ev ? [ev.label] : [];
    }),
  );
  const moods = tally(list.map((e) => `${moodOf(e.mood).emoji} ${moodOf(e.mood).label}`));
  const relationship = triggerKey === "intimate";
  const urgeRows = relationship ? tally(urges.flatMap((u) => u.triggers.map(urgeTriggerLabel))) : [];
  const label = triggerLabel(triggerKey);

  return (
    <div className="space-y-5 pb-1">
      <div className="pr-10">
        <p className="text-xs text-muted-foreground">触发因素细分</p>
        <h2 className="mt-1 font-display text-xl font-semibold">
          {label}
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {list.length > 0 ? `${list.length} 条情绪记录` : ""}
            {list.length > 0 && relationship && urges.length > 0 ? " · " : ""}
            {relationship && urges.length > 0 ? `${urges.length} 次联系冲动` : ""}
          </span>
        </h2>
      </div>

      {events.length > 0 && <Rows title="具体是什么事" rows={events} />}
      {relationship && urgeRows.length > 0 && <Rows title="想联系 TA 的时刻" rows={urgeRows} />}
      {moods.length > 0 && <Rows title="当时的情绪" rows={moods} />}
      {events.length === 0 && (triggerKey === "work" || triggerKey === "family") && list.length > 0 && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          从「今天 → 特别时期」记录时选一下发生了什么，这里就能看到更具体的细分。
        </p>
      )}

      {list.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground">最近的记录</p>
          <ul className="mt-2 divide-y divide-border/70">
            {list.slice(0, 3).map((e) => {
              const ev = eventOf(e.record_type, e.event);
              return (
                <li key={e.id} className="py-2.5 text-sm">
                  <p className="text-xs text-muted-foreground">
                    {whenText(e.createdAt)} · {moodOf(e.mood).emoji} {moodOf(e.mood).label} {e.intensity}/5
                    {ev ? ` · ${ev.label}` : ""}
                  </p>
                  {e.note && <p className="mt-0.5 line-clamp-2 leading-relaxed">{e.note}</p>}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <Link
          to="/journal"
          search={{ trigger: triggerKey, ...(demo ? { demo: 1 as const } : {}) }}
          onClick={onClose}
          className="font-medium underline-offset-4 hover:underline"
        >
          查看对应记录 →
        </Link>
        {relationship && (
          <a
            href="#recovery"
            onClick={(ev) => {
              ev.preventDefault();
              onClose();
              window.setTimeout(() => document.getElementById("recovery")?.scrollIntoView({ behavior: "smooth" }), 250);
            }}
            className="text-muted-foreground underline-offset-4 hover:underline"
          >
            看看恢复轨迹
          </a>
        )}
      </div>
    </div>
  );
}
