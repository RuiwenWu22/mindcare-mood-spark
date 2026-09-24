import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { MoodComposer } from "@/components/mood-composer";
import { useEntries } from "@/hooks/use-entries";
import { downloadCsv, formatDate, moodOf, triggerLabel } from "@/lib/mood";

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

function JournalPage() {
  const { entries, ready, removeEntry } = useEntries();
  const [composing, setComposing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">情绪日记</h1>
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
              downloadCsv(entries);
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

      {composing && <MoodComposer title="记录一条新的感受" />}

      {ready && entries.length === 0 && (
        <div className="card-soft px-6 py-12 text-center">
          <p className="font-display text-lg">这里还很安静</p>
          <p className="mt-2 text-sm text-muted-foreground">点击「新建记录」，写下此刻的心情。</p>
        </div>
      )}

      <div className="space-y-3">
        {entries.map((e) => {
          const mood = moodOf(e.mood);
          return (
            <article key={e.id} className="card-soft animate-rise px-5 py-5 sm:px-6">
              <div className="flex items-start gap-4">
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
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
                    <span className="text-xs text-muted-foreground">{formatDate(e.createdAt)}</span>
                  </div>
                  {e.note && (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                      {e.note}
                    </p>
                  )}
                  {e.triggers.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {e.triggers.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-accent-soft px-2.5 py-1 text-xs text-foreground/75"
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
