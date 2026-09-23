import { useState } from "react";
import { toast } from "sonner";
import { Footprints, Music, Wind } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { MOODS, TRIGGERS, type MoodKey, type TriggerKey } from "@/lib/mood";
import { recommendFor, type CareRecommendation } from "@/lib/care-recs";
import { BreathingSession } from "@/components/breathing-session";
import { useEntries } from "@/hooks/use-entries";
import { cn } from "@/lib/utils";

export function MoodComposer({ title = "你现在感觉怎么样？" }: { title?: string }) {
  const { addEntry } = useEntries();
  const [mood, setMood] = useState<MoodKey | null>(null);
  const [intensity, setIntensity] = useState(5);
  const [note, setNote] = useState("");
  const [triggers, setTriggers] = useState<TriggerKey[]>([]);
  const [rec, setRec] = useState<CareRecommendation | null>(null);
  const [breathing, setBreathing] = useState(false);

  const toggleTrigger = (key: TriggerKey) =>
    setTriggers((prev) => (prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]));

  const save = () => {
    if (!mood) {
      toast("先选一个此刻最接近的情绪吧");
      return;
    }
    addEntry({ mood, intensity, note, triggers });
    setRec(recommendFor(mood, intensity));
    setMood(null);
    setIntensity(5);
    setNote("");
    setTriggers([]);
    toast.success("今天的情绪已经被好好记录了 🌿", {
      description: "可以到「情绪日记」里回顾它。",
    });
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
              <label className="text-sm font-medium">情绪强度</label>
              <span className="font-display text-lg">{intensity} / 10</span>
            </div>
            <input
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
            <label className="text-sm font-medium">发生了什么？（选填）</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="发生了什么？写下此刻的感受……不写也没关系。"
              className="mt-3 w-full resize-none rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-card"
            />
          </div>

          <div>
            <label className="text-sm font-medium">触发因素（可多选）</label>

            <div className="mt-3 flex flex-wrap gap-2">
              {TRIGGERS.map((t) => {
                const active = triggers.includes(t.key);
                return (
                  <button
                    key={t.key}
                    onClick={() => toggleTrigger(t.key)}
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
        </div>
      )}

      <button
        onClick={save}
        className="mt-7 w-full rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:opacity-95 sm:w-auto sm:px-10"
      >
        保存今天的情绪
      </button>
    </section>
  );
}
