import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { BottomSheet } from "@/components/bottom-sheet";
import { AiCard, WhyToggle } from "@/components/ai-card";
import { Placeholder } from "@/components/section";
import { useRecordSheet } from "@/components/record-sheet";
import { useEntries } from "@/hooks/use-entries";
import { useInterventions } from "@/hooks/use-interventions";
import { MOODS, activityOf, dayKey, downloadCsv, entryDay, moodOf, triggerLabel, type Entry, type MoodKey } from "@/lib/mood";
import { csvDayInfo, loadBody } from "@/lib/body";
import { understandEntry } from "@/lib/understand";
import type { Intervention } from "@/lib/interventions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/journal")({
  head: () => ({
    meta: [
      { title: "记录｜MindCare" },
      { name: "description", content: "回顾你写下的每一条情绪记录，以及每次调节前后的变化。" },
      { property: "og:title", content: "记录｜MindCare" },
      { property: "og:description", content: "回顾你写下的每一条情绪记录。" },
    ],
  }),
  component: RecordsPage,
});

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function dayTitle(key: string) {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d);
  const today = new Date();
  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  const label = `${m} 月 ${d} 日 ${WEEKDAYS[date.getDay()]}`;
  if (key === dayKey(today)) return `今天 · ${label}`;
  if (key === dayKey(yest)) return `昨天 · ${label}`;
  return y === today.getFullYear() ? label : `${y} 年 ${label}`;
}

const timeOf = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

function RecordsPage() {
  const { entries, ready, removeEntry } = useEntries();
  const { interventions } = useInterventions();
  const { open } = useRecordSheet();
  const [moodFilter, setMoodFilter] = useState<MoodKey | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  const present = MOODS.filter((m) => entries.some((e) => e.mood === m.key));
  const shown = entries.filter((e) => !moodFilter || e.mood === moodFilter);
  const groups: { key: string; items: Entry[] }[] = [];
  for (const e of shown) {
    const k = entryDay(e);
    const last = groups[groups.length - 1];
    if (last && last.key === k) last.items.push(e);
    else groups.push({ key: k, items: [e] });
  }
  const chip = (active: boolean) =>
    cn(
      "shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors",
      active ? "border-transparent bg-primary-soft font-medium text-foreground" : "border-border bg-card text-muted-foreground hover:bg-secondary",
    );
  const ivOf = (id: string) => interventions.filter((i) => i.linked_mood_record_id === id);
  const current = entries.find((e) => e.id === detail) ?? null;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">记录</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {ready ? `一共 ${entries.length} 条。点开一条，可以看到 AI 的整理和调节前后的变化。` : "正在读取你的记录……"}
          </p>
        </div>
        {entries.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => open()}
              className="rounded-full border border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-secondary"
            >
              记一条
            </button>
            <button
              onClick={() => {
                downloadCsv(entries, csvDayInfo(loadBody()), interventions);
                toast("记录已导出为 CSV");
              }}
              aria-label="导出 CSV"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">导出</span>
            </button>
          </div>
        )}
      </header>

      {!ready && (
        <div className="space-y-3">
          <Placeholder className="h-20 w-full" />
          <Placeholder className="h-20 w-full" />
        </div>
      )}

      {ready && entries.length === 0 && (
        <div className="card-soft px-6 py-12 text-center">
          <p className="font-display text-lg">这里还很安静</p>
          <p className="mt-2 text-sm text-muted-foreground">记下第一条感受后，会按天出现在这里。</p>
          <button
            onClick={() => open()}
            className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)]"
          >
            记录今天的情绪
          </button>
        </div>
      )}

      {ready && present.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" role="group" aria-label="按情绪筛选">
          <button onClick={() => setMoodFilter(null)} className={chip(moodFilter === null)} aria-pressed={moodFilter === null}>
            全部
          </button>
          {present.map((m) => (
            <button
              key={m.key}
              onClick={() => setMoodFilter(moodFilter === m.key ? null : m.key)}
              aria-pressed={moodFilter === m.key}
              className={chip(moodFilter === m.key)}
            >
              {m.emoji} {m.label}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-6">
        {groups.map((g) => (
          <section key={g.key} aria-label={dayTitle(g.key)}>
            <h2 className="mb-2 flex items-baseline gap-2 px-1 text-sm font-medium">
              {dayTitle(g.key)}
              <span className="text-xs font-normal text-muted-foreground">{g.items.length} 条</span>
            </h2>
            <ul className="card-soft divide-y divide-border/70 overflow-hidden">
              {g.items.map((e) => {
                const mood = moodOf(e.mood);
                const done = ivOf(e.id)[0];
                return (
                  <li key={e.id}>
                    <button onClick={() => setDetail(e.id)} className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/50 sm:px-5">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
                        style={{ backgroundColor: `color-mix(in oklab, ${mood.color} 26%, white)` }}
                      >
                        {mood.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline gap-x-2">
                          <span className="font-medium">{mood.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {e.intensity}/5 · {timeOf(e.createdAt)}
                            {e.triggers.length ? ` · ${e.triggers.map(triggerLabel).join("、")}` : ""}
                          </span>
                        </span>
                        {e.note && <span className="mt-1 block truncate text-sm text-foreground/80">{e.note}</span>}
                        {done && (
                          <span className="mt-1 block text-xs text-muted-foreground">
                            🌿 {done.intervention_name} · {done.before_score} → {done.after_score}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <BottomSheet open={!!current} onClose={() => setDetail(null)} label="记录详情">
        {current && (
          <RecordDetail
            entry={current}
            history={entries.filter((e) => e.id !== current.id)}
            interventions={ivOf(current.id)}
            onDelete={() => {
              removeEntry(current.id);
              setDetail(null);
              toast("这条记录已经删除");
            }}
          />
        )}
      </BottomSheet>
    </div>
  );
}

function RecordDetail({
  entry,
  history,
  interventions,
  onDelete,
}: {
  entry: Entry;
  history: Entry[];
  interventions: Intervention[];
  onDelete: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const mood = moodOf(entry.mood);
  const u = understandEntry(entry, history);
  const d = new Date(entry.createdAt);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 pr-10">
        <span
          className="flex h-14 w-14 items-center justify-center rounded-2xl text-3xl"
          style={{ backgroundColor: `color-mix(in oklab, ${mood.color} 28%, white)` }}
        >
          {mood.emoji}
        </span>
        <div>
          <p className="font-display text-xl font-semibold">
            {mood.label} <span className="text-base font-normal text-muted-foreground">{entry.intensity}/5</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {dayTitle(entryDay(entry))} {timeOf(entry.createdAt)}
            {d.getFullYear() !== new Date().getFullYear() ? ` · ${d.getFullYear()}` : ""}
          </p>
        </div>
      </div>

      {(entry.triggers.length > 0 || entry.activity || entry.song) && (
        <div className="flex flex-wrap gap-1.5 text-xs">
          {entry.triggers.map((t) => (
            <span key={t} className="rounded-full bg-secondary px-2.5 py-1">
              {triggerLabel(t)}
            </span>
          ))}
          {entry.activity && (
            <span className="rounded-full bg-secondary px-2.5 py-1">
              {activityOf(entry.activity).emoji} {activityOf(entry.activity).label}
            </span>
          )}
          {entry.song && (
            <span className="rounded-full bg-secondary px-2.5 py-1">
              🎵《{entry.song.title}》{entry.song.artist ? ` · ${entry.song.artist}` : ""}
              {entry.song.url && (
                <a href={entry.song.url} target="_blank" rel="noopener noreferrer" className="ml-1.5 underline">
                  去听
                </a>
              )}
            </span>
          )}
        </div>
      )}

      {entry.note && <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{entry.note}</p>}

      <AiCard title="AI 帮你整理了一下">
        <p className="text-sm leading-relaxed">{u.text}</p>
        <WhyToggle items={u.evidence} />
      </AiCard>

      <div>
        <p className="text-sm font-medium">调节</p>
        {interventions.length === 0 ? (
          <p className="mt-1.5 text-sm text-muted-foreground">这次没有做调节。</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {interventions.map((i) => (
              <li key={i.id} className="flex items-baseline justify-between gap-3 rounded-2xl bg-secondary/50 px-4 py-3 text-sm">
                <span>{i.intervention_name}</span>
                <span className="shrink-0 tabular-nums">
                  {i.before_score} → {i.after_score}
                  {i.duration > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">{Math.max(1, Math.round(i.duration / 60))} 分钟</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-border/70 pt-4 text-sm">
        {!confirm ? (
          <button onClick={() => setConfirm(true)} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" /> 删除这条记录
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2" role="alertdialog">
            <span>删除后就找不回来了，关联的调节记录也会一起删除。</span>
            <button onClick={onDelete} className="rounded-full bg-destructive px-4 py-1.5 text-destructive-foreground">
              删除
            </button>
            <button onClick={() => setConfirm(false)} className="rounded-full border border-border px-4 py-1.5">
              再想想
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
