import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { MoodComposer } from "@/components/mood-composer";
import { SampleNotice } from "@/components/sample-notice";
import { useEntries } from "@/hooks/use-entries";
import { Placeholder } from "@/components/section";
import {
  MOODS,
  activityOf,
  dayKey,
  downloadCsv,
  entryDay,
  isSample,
  moodOf,
  triggerLabel,
  type Entry,
  type MoodKey,
} from "@/lib/mood";
import { cn } from "@/lib/utils";
import { csvDayInfo, loadBody } from "@/lib/body";

export const Route = createFileRoute("/journal")({
  head: () => ({
    meta: [
      { title: "情绪日记｜MindCare" },
      { name: "description", content: "回顾你写下的每一条情绪记录：日期、情绪、强度、触发因素。" },
      { property: "og:title", content: "情绪日记｜MindCare" },
      { property: "og:description", content: "回顾你写下的每一条情绪记录。" },
    ],
  }),
  component: JournalPage,
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

function JournalPage() {
  const { entries, ready, removeEntry } = useEntries();
  const [composing, setComposing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [moodFilter, setMoodFilter] = useState<MoodKey | null>(null);
  const [ownOnly, setOwnOnly] = useState(false);

  const hasSamples = entries.some(isSample);
  const present = MOODS.filter((m) => entries.some((e) => e.mood === m.key));
  const shown = entries.filter(
    (e) => (!moodFilter || e.mood === moodFilter) && (!ownOnly || !isSample(e)),
  );
  // 按天分组；entries 已经按时间倒序
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
      active
        ? "border-transparent bg-primary-soft font-medium text-foreground"
        : "border-border bg-card text-muted-foreground hover:bg-secondary",
    );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">日记</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {ready ? `你一共记录了 ${entries.length} 条感受。` : "正在读取你的记录……"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              if (entries.length === 0) {
                toast("还没有可以导出的记录");
                return;
              }
              downloadCsv(entries, csvDayInfo(loadBody()));
              toast("情绪记录已导出为 CSV 🌿");
            }}
            disabled={!ready || entries.length === 0}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            导出 CSV
          </button>
          <button
            onClick={() => setComposing((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5"
          >
            {composing ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {composing ? "收起" : "新建记录"}
          </button>
        </div>
      </header>

      <SampleNotice />

      {composing && <MoodComposer title="记录一条新的感受" />}

      {ready && entries.length === 0 && (
        <div className="card-soft px-6 py-12 text-center">
          <p className="font-display text-lg">这里还很安静</p>
          <p className="mt-2 text-sm text-muted-foreground">点击「新建记录」，写下此刻的心情。</p>
        </div>
      )}

      {ready && entries.length > 0 && (
        <div
          className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]"
          role="group"
          aria-label="筛选"
        >
          <button
            onClick={() => setMoodFilter(null)}
            className={chip(moodFilter === null)}
            aria-pressed={moodFilter === null}
          >
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
          {hasSamples && (
            <button
              onClick={() => setOwnOnly((v) => !v)}
              aria-pressed={ownOnly}
              className={cn(chip(ownOnly), "ml-auto")}
            >
              只看我的
            </button>
          )}
        </div>
      )}

      {!ready && (
        <div className="space-y-3">
          <Placeholder className="h-24 w-full" />
          <Placeholder className="h-24 w-full" />
        </div>
      )}

      {ready && entries.length > 0 && shown.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">没有符合条件的记录。</p>
      )}

      <div className="space-y-7">
        {groups.map((g) => (
          <section key={g.key} aria-label={dayTitle(g.key)}>
            <h2 className="mb-2.5 flex items-baseline gap-2 px-1 text-sm font-medium">
              {dayTitle(g.key)}
              <span className="text-xs font-normal text-muted-foreground">{g.items.length} 条</span>
            </h2>
            <div className="space-y-2.5">
              {g.items.map((e) => {
                const mood = moodOf(e.mood);
                return (
                  <article key={e.id} className="card-soft px-4 py-4 sm:px-5">
                    <div className="flex items-start gap-4">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
                        style={{ backgroundColor: `color-mix(in oklab, ${mood.color} 26%, white)` }}
                      >
                        {mood.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="font-medium">{mood.label}</span>
                          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
                            强度 {e.intensity}/10
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {timeOf(e.createdAt)}
                          </span>
                          {e.activity && (
                            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
                              {activityOf(e.activity).emoji} {activityOf(e.activity).label}
                            </span>
                          )}
                          {isSample(e) && (
                            <span className="rounded-full border border-dashed border-primary/50 px-2 py-0.5 text-[11px] text-muted-foreground">
                              示例
                            </span>
                          )}
                        </div>
                        {e.note && (
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                            {e.note}
                          </p>
                        )}
                        {e.song && (
                          <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>
                              🎵《{e.song.title}》{e.song.artist ? ` · ${e.song.artist}` : ""}
                            </span>
                            {e.song.url && (
                              <a
                                href={e.song.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline underline-offset-2 hover:text-foreground"
                              >
                                去听
                              </a>
                            )}
                          </p>
                        )}
                        {(e.followUps ?? []).map((f) => (
                          <p key={f.at} className="mt-2 text-xs text-muted-foreground">
                            🫁 {f.label}后：
                            <span className="font-medium text-foreground/80">
                              {f.before} → {f.after}
                            </span>
                          </p>
                        ))}
                        {e.triggers.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {e.triggers.map((t) => (
                              <span
                                key={t}
                                className="rounded-full bg-secondary px-2.5 py-1 text-xs text-foreground/75"
                              >
                                {triggerLabel(t)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setPendingDelete(e.id)}
                        aria-label="删除这条记录"
                        className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 px-6 backdrop-blur-sm">
          <div className="card-soft w-full max-w-sm px-6 py-6">
            <h2 className="font-display text-lg font-semibold">删除这条记录？</h2>
            <p className="mt-2 text-sm text-muted-foreground">删除之后就找不回来了。</p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setPendingDelete(null)}
                className="rounded-full border border-border px-4 py-2 text-sm transition-colors hover:bg-secondary"
              >
                再想想
              </button>
              <button
                onClick={() => {
                  removeEntry(pendingDelete);
                  setPendingDelete(null);
                  toast("这条记录已经删除");
                }}
                className="rounded-full bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
