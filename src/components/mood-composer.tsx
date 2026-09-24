import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ACTIVITIES,
  MOODS,
  TRIGGERS,
  moodOf,
  type ActivityKey,
  type Entry,
  type MoodKey,
  type TriggerKey,
} from "@/lib/mood";
import { assessRisk, type Risk } from "@/lib/safety";
import { parseSongInput, PLATFORM_LABEL } from "@/lib/songs";
import { RecommendationPanel } from "@/components/recommendation-panel";
import { useEntries } from "@/hooks/use-entries";
import { cn } from "@/lib/utils";

export function MoodComposer({ title = "你现在感觉怎么样？" }: { title?: string }) {
  const { addEntry } = useEntries();
  const [mood, setMood] = useState<MoodKey | null>(null);
  const [intensity, setIntensity] = useState(5);
  const [activity, setActivity] = useState<ActivityKey | null>(null);
  const [note, setNote] = useState("");
  const [triggers, setTriggers] = useState<TriggerKey[]>([]);
  const [songInput, setSongInput] = useState("");
  const song = useMemo(() => parseSongInput(songInput), [songInput]);
  const [saved, setSaved] = useState<{ entry: Entry; risk: Risk } | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (saved) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [saved]);

  const toggleTrigger = (key: TriggerKey) =>
    setTriggers((prev) => (prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]));

  const save = () => {
    if (!mood) {
      toast("先选一个此刻最接近的情绪吧");
      return;
    }
    const entry = addEntry({ mood, intensity, note, triggers, activity, song });
    const risk = assessRisk({ valence: moodOf(mood).valence, intensity, note });
    setSaved({ entry, risk });
    setMood(null);
    setIntensity(5);
    setActivity(null);
    setNote("");
    setTriggers([]);
    setSongInput("");
    if (risk === "crisis") {
      toast("这条记录已经保存");
    } else {
      toast.success("今天的情绪已经被好好记录了 🌿", {
        description: "可以到「情绪日记」里回顾它。",
      });
    }
  };

  return (
    <section className="card-soft animate-rise px-6 py-7 sm:px-8">
      <h2 className="font-display text-xl font-semibold sm:text-2xl">{title}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">选一个最接近的就好，不用很准确。</p>

      <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {MOODS.map((m) => {
          const active = mood === m.key;
          return (
            <button
              key={m.key}
              onClick={() => setMood(m.key)}
              aria-pressed={active}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-2xl border px-3 py-4 transition-all",
                active
                  ? "border-transparent shadow-[var(--shadow-soft)] ring-2 ring-primary"
                  : "border-border bg-secondary/40 hover:-translate-y-0.5 hover:bg-secondary",
              )}
              style={active ? { backgroundColor: `color-mix(in oklab, ${m.color} 28%, white)` } : undefined}
            >
              <span className="text-2xl">{m.emoji}</span>
              <span className="text-sm">{m.label}</span>
            </button>
          );
        })}
      </div>

      {mood && (
        <div className="animate-rise mt-7 space-y-6">
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="intensity" className="text-sm font-medium">
                情绪强度
              </label>
              <span className="font-display text-lg">{intensity} / 10</span>
            </div>
            <input
              id="intensity"
              type="range"
              min={1}
              max={10}
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-[var(--primary)]"
            />
            <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
              <span>很轻微</span>
              <span>非常强烈</span>
            </div>
          </div>

          <div>
            <span className="text-sm font-medium">此刻在做什么？（可选）</span>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="此刻在做什么">
              {ACTIVITIES.map((a) => {
                const active = activity === a.key;
                return (
                  <button
                    key={a.key}
                    onClick={() => setActivity(active ? null : a.key)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      active
                        ? "border-transparent bg-accent-soft font-medium text-foreground"
                        : "border-border text-muted-foreground hover:bg-secondary",
                    )}
                  >
                    <span aria-hidden>{a.emoji}</span> {a.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="text-sm font-medium">和什么有关？（可多选）</span>
            <div className="mt-3 flex flex-wrap gap-2">
              {TRIGGERS.map((t) => {
                const active = triggers.includes(t.key);
                return (
                  <button
                    key={t.key}
                    onClick={() => toggleTrigger(t.key)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                      active
                        ? "border-transparent bg-primary-soft font-medium text-foreground"
                        : "border-border text-muted-foreground hover:bg-secondary",
                    )}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="note" className="text-sm font-medium">
              想多说一句吗？（选填）
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="发生了什么？写下此刻的感受……不写也没关系。"
              className="mt-3 w-full resize-none rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-card"
            />
          </div>

          <div>
            <label htmlFor="song" className="text-sm font-medium">
              此刻在听什么？（选填）
            </label>
            <input
              id="song"
              value={songInput}
              onChange={(e) => setSongInput(e.target.value)}
              placeholder="粘贴网易云、QQ 音乐或 Apple Music 的分享，或直接输入歌名"
              className="mt-3 w-full rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-card"
            />
            {song && (
              <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
                {song.title ? (
                  <>
                    识别为：🎵《{song.title}》{song.artist ? ` · ${song.artist}` : ""}
                    {song.platform ? ` · ${PLATFORM_LABEL[song.platform]}` : ""}
                  </>
                ) : (
                  "没识别到歌名，可以直接输入歌名。"
                )}
              </p>
            )}
          </div>
        </div>
      )}

      <button
        onClick={save}
        className="mt-7 w-full rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:opacity-95 sm:w-auto sm:px-10"
      >
        保存今天的情绪
      </button>

      <div ref={resultRef}>
        {saved && <RecommendationPanel key={saved.entry.id} entry={saved.entry} risk={saved.risk} />}
      </div>
    </section>
  );
}
