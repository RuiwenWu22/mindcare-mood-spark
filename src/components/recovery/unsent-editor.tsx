import { useState } from "react";
import { Lock } from "lucide-react";
import { AiCard } from "@/components/ai-card";
import { IntensityPicker } from "@/components/intensity-picker";
import { SupportCard } from "@/components/support-card";
import { hasCrisisSignal } from "@/lib/safety";
import { UNSENT_EMOTIONS, newId, updateRecovery, type UnsentMessage } from "@/lib/recovery";
import { analyzeUnsent } from "@/lib/recovery-ai";
import { cn } from "@/lib/utils";

/** 「✨ 这段话里，你可能在表达」：只分析用户自己的表达 */
export function UnsentAnalysis({ summary }: { summary: UnsentMessage["ai_summary"] }) {
  if (summary.feelings.length === 0 && !summary.expectation) {
    return (
      <AiCard title="这段话里，你可能在表达">
        <p className="text-sm leading-relaxed">这段话里的感受很真实。写下来，本身就是在照顾自己。</p>
      </AiCard>
    );
  }
  return (
    <AiCard title="这段话里，你可能在表达">
      {summary.feelings.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {summary.feelings.map((f) => (
            <span key={f} className="rounded-full bg-card px-3 py-1 text-sm">
              {f}
            </span>
          ))}
        </div>
      )}
      {summary.expectation && (
        <p className="mt-3 text-sm leading-relaxed">
          你可能真正期待的是：<span className="font-medium">{summary.expectation}</span>
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">只根据你写下的话整理，不判断 TA 的想法。</p>
    </AiCard>
  );
}

/** 写一段没有发送的话 */
export function UnsentEditor({ onClose }: { onClose: () => void }) {
  const [content, setContent] = useState("");
  const [emotion, setEmotion] = useState<string | null>(null);
  const [urge, setUrge] = useState<number | null>(null);
  const [saved, setSaved] = useState<UnsentMessage | null>(null);

  if (saved) {
    return (
      <div className="space-y-4 pb-1">
        <p className="pr-10 font-display text-xl font-semibold">保存好了，没有发送</p>
        {hasCrisisSignal(saved.content) ? <SupportCard onBreathe={onClose} /> : <UnsentAnalysis summary={saved.ai_summary} />}
        <button onClick={onClose} className="w-full rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground">
          完成
        </button>
      </div>
    );
  }

  return (
    <div className="pb-1">
      <p className="flex items-center gap-1.5 pr-10 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5" /> 这里只是给你自己的空间，这些内容不会自动发送。
      </p>
      <h2 className="mt-3 font-display text-xl font-semibold">写一段没有发送的话</h2>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={7}
        aria-label="没有发送的话"
        placeholder="想说什么都可以，写给 TA，也可以写给自己。"
        className="mt-4 w-full resize-none rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground focus:border-primary focus:bg-card"
      />
      <p className="mt-5 text-sm font-medium">
        现在的感受 <span className="font-normal text-muted-foreground">可选</span>
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {UNSENT_EMOTIONS.map((e) => (
          <button
            key={e}
            aria-pressed={emotion === e}
            onClick={() => setEmotion(emotion === e ? null : e)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm",
              emotion === e ? "border-primary/70 bg-primary-soft font-medium" : "border-border text-muted-foreground",
            )}
          >
            {e}
          </button>
        ))}
      </div>
      <p className="mt-5 text-sm font-medium">
        现在有多想联系 TA？ <span className="font-normal text-muted-foreground">可选</span>
      </p>
      <div className="mt-2">
        <IntensityPicker value={urge} onChange={setUrge} label="联系冲动" low="有一点想" high="非常想" />
      </div>
      <button
        disabled={!content.trim()}
        onClick={() => {
          const item: UnsentMessage = {
            id: newId("unsent"),
            created_at: new Date().toISOString(),
            content: content.trim(),
            ...(emotion ? { emotion } : {}),
            ...(urge ? { urge_score: urge } : {}),
            ai_summary: analyzeUnsent(content),
          };
          updateRecovery((d) => ({ ...d, unsent: [...d.unsent, item] }));
          setSaved(item);
        }}
        className="mt-6 w-full rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)] disabled:opacity-45"
      >
        保存，不发送
      </button>
    </div>
  );
}
