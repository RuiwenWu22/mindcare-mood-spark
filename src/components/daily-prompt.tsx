import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { DAILY_PROMPTS } from "@/lib/mood";

export function DailyPrompt() {
  const [index, setIndex] = useState(() => new Date().getDate() % DAILY_PROMPTS.length);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-accent-soft px-6 py-7 shadow-[var(--shadow-soft)] sm:px-8">
      <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-primary-soft/70 blur-2xl" />
      <div className="relative">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">每日自我关怀</p>
        <p className="mt-4 font-display text-xl leading-relaxed text-foreground sm:text-2xl">
          {DAILY_PROMPTS[index]}
        </p>
        <button
          onClick={() => setIndex((i) => (i + 1) % DAILY_PROMPTS.length)}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-medium text-foreground shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5"
        >
          <RefreshCw className="h-4 w-4" />
          换一句
        </button>
      </div>
    </section>
  );
}
