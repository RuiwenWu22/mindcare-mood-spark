import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Copy, Lock } from "lucide-react";
import { toast } from "sonner";
import { AiCard } from "@/components/ai-card";
import { BottomSheet } from "@/components/bottom-sheet";
import { UrgeFlow } from "@/components/recovery/urge-flow";
import {
  MESSAGE_ACTIONS,
  MESSAGE_FEELINGS,
  newId,
  updateRecovery,
  type MessageAction,
} from "@/lib/recovery";
import { MESSAGE_ACTION_REPLY, replyDrafts, reviewMessage } from "@/lib/recovery-ai";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/recovery/message")({
  head: () => ({
    meta: [
      { title: "TA 给我发消息了｜MindCare" },
      { name: "description", content: "先看看这条消息实际说了什么，再决定怎么处理。" },
    ],
  }),
  component: MessagePage,
});

function MessagePage() {
  const [msg, setMsg] = useState("");
  const [result, setResult] = useState<ReturnType<typeof reviewMessage> | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [feelings, setFeelings] = useState<string[]>([]);
  const [action, setAction] = useState<MessageAction | null>(null);
  const [drafts, setDrafts] = useState<ReturnType<typeof replyDrafts> | null>(null);
  const [urge, setUrge] = useState(false);

  const patch = (p: { user_emotions?: string[]; action_choice?: MessageAction }) =>
    reviewId && updateRecovery((d) => ({ ...d, reviews: d.reviews.map((r) => (r.id === reviewId ? { ...r, ...p } : r)) }));

  const split = () => {
    const text = msg.trim();
    if (!text) return;
    setResult(reviewMessage(text));
    setFeelings([]);
    setAction(null);
    setDrafts(null);
    const id = newId("review");
    updateRecovery((d) => ({
      ...d,
      reviews: [...d.reviews, { id, created_at: new Date().toISOString(), original_message: text, user_emotions: [] }],
    }));
    setReviewId(id);
  };

  return (
    <div className="space-y-5">
      <header>
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> 今天
        </Link>
        <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">先看看这条消息实际说了什么</h1>
      </header>

      <section className="card-soft px-5 py-5 sm:px-7">
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          rows={4}
          aria-label="粘贴 TA 发来的消息"
          placeholder="粘贴 TA 发来的消息"
          className="w-full resize-none rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground focus:border-primary focus:bg-card"
        />
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" /> 只保存在这台设备上，只拆解文字本身，不猜测 TA 的想法。
        </p>
        <button
          onClick={split}
          disabled={!msg.trim()}
          className="mt-4 w-full rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)] disabled:opacity-45 sm:w-auto sm:px-10"
        >
          帮我拆一下
        </button>
      </section>

      {result && (
        <>
          <AiCard title="这条消息明确表达了">
            <ul className="space-y-1 text-[15px] leading-relaxed">
              {result.facts.map((f) => (
                <li key={f}>· {f}</li>
              ))}
            </ul>
          </AiCard>
          <section className="card-soft px-5 py-4 sm:px-7">
            <p className="text-sm font-medium">仅凭这条消息还不能确定</p>
            <ul className="mt-2 space-y-1 text-sm text-foreground/80">
              {result.unknown.map((u) => (
                <li key={u}>· {u}</li>
              ))}
            </ul>
          </section>

          <section className="card-soft px-5 py-5 sm:px-7">
            <p className="text-sm font-medium">这条消息让你有什么感觉？</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {MESSAGE_FEELINGS.map((f) => {
                const on = feelings.includes(f);
                return (
                  <button
                    key={f}
                    aria-pressed={on}
                    onClick={() => {
                      const next = on ? feelings.filter((x) => x !== f) : [...feelings, f];
                      setFeelings(next);
                      patch({ user_emotions: next });
                    }}
                    className={cn(
                      "rounded-full border px-3.5 py-2 text-sm transition-colors",
                      on ? "border-primary/70 bg-primary-soft font-medium" : "border-border text-muted-foreground hover:bg-secondary",
                    )}
                  >
                    {f}
                  </button>
                );
              })}
            </div>

            <p className="mt-6 text-sm font-medium">你现在想怎么处理？</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {MESSAGE_ACTIONS.map((a) => (
                <button
                  key={a.key}
                  aria-pressed={action === a.key}
                  onClick={() => {
                    setAction(a.key);
                    setDrafts(null);
                    patch({ action_choice: a.key });
                  }}
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-sm transition-colors",
                    action === a.key ? "border-primary/70 bg-primary-soft font-medium" : "border-border hover:bg-secondary",
                  )}
                >
                  {a.label}
                </button>
              ))}
            </div>
            {action && <p className="mt-4 text-sm leading-relaxed text-foreground/85">{MESSAGE_ACTION_REPLY[action]}</p>}
            {action === "reply" && !drafts && (
              <button
                onClick={() => setDrafts(replyDrafts(msg))}
                className="mt-3 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
              >
                帮我整理回复
              </button>
            )}
            {drafts && (
              <div className="mt-4 space-y-2.5">
                {drafts.map((d) => (
                  <div key={d.tone} className="rounded-2xl bg-secondary/50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">{d.tone}</p>
                      <button
                        onClick={() => {
                          void navigator.clipboard?.writeText(d.text).then(
                            () => toast("已复制，发不发由你决定"),
                            () => toast("复制失败，可以手动选中文字"),
                          );
                        }}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="h-3.5 w-3.5" /> 复制
                      </button>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed">{d.text}</p>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">MindCare 只生成文字，不会替你发送。改不改、发不发，都由你决定。</p>
              </div>
            )}
            <button onClick={() => setUrge(true)} className="mt-6 block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
              想回复的冲动很强？先停一下
            </button>
          </section>
        </>
      )}

      <BottomSheet open={urge} onClose={() => setUrge(false)} label="我现在很想联系 TA">
        {urge && <UrgeFlow onClose={() => setUrge(false)} presetTriggers={["message"]} />}
      </BottomSheet>
    </div>
  );
}
