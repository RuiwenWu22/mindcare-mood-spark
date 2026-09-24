import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { BottomSheet } from "@/components/bottom-sheet";
import { AiCard, WhyToggle } from "@/components/ai-card";
import { Placeholder } from "@/components/section";
import { useRecordSheet } from "@/components/record-sheet";
import { useEntries } from "@/hooks/use-entries";
import { useInterventions } from "@/hooks/use-interventions";
import { MOODS, activityOf, dayKey, downloadCsv, entryDay, moodOf, triggerLabel, type Entry, type MoodKey, type TriggerKey } from "@/lib/mood";
import { csvDayInfo, loadBody } from "@/lib/body";
import { understandEntry } from "@/lib/understand";
import type { Intervention } from "@/lib/interventions";
import { cn } from "@/lib/utils";
import { demoData, recoveryDemo } from "@/lib/demo";
import { RECORD_TYPES, RELATIONSHIP_EMPTY, SCENARIOS, eventOf, isRecordType, recordTypeOf, type RecordType } from "@/lib/scenarios";
import { Segmented } from "@/components/section";
import { UnsentAnalysis } from "@/components/recovery/unsent-editor";
import { useRecovery } from "@/hooks/use-recovery";
import {
  MESSAGE_ACTIONS,
  desireLabel,
  urgeTriggerLabel,
  type ContactEvent,
  type ContactUrge,
  type IncomingMessageReview,
  type UnsentMessage,
} from "@/lib/recovery";
import { pauseCard, reviewMessage } from "@/lib/recovery-ai";

export const Route = createFileRoute("/journal")({
  validateSearch: (s: Record<string, unknown>): { demo?: 1; type?: RecordType; trigger?: string } => ({
    ...(s["demo"] === 1 || s["demo"] === "1" ? { demo: 1 as const } : {}),
    ...(isRecordType(s["type"]) ? { type: s["type"] } : {}),
    ...(typeof s["trigger"] === "string" && s["trigger"] ? { trigger: s["trigger"] } : {}),
  }),
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

/** 记录页上的一条：情绪记录，或感情变化里的联系冲动 / 没有发送的话 / TA 发来的消息 / 联系了 TA */
type Item =
  | { kind: "entry"; id: string; at: string; type: RecordType; entry: Entry }
  | { kind: "urge"; id: string; at: string; type: "relationship"; urge: ContactUrge }
  | { kind: "unsent"; id: string; at: string; type: "relationship"; unsent: UnsentMessage }
  | { kind: "review"; id: string; at: string; type: "relationship"; review: IncomingMessageReview }
  | { kind: "contact"; id: string; at: string; type: "relationship"; contact: ContactEvent };

type Filter = "all" | RecordType;
const FILTERS: { key: Filter; label: string }[] = [{ key: "all", label: "全部" }, ...RECORD_TYPES.map((t) => ({ key: t.key, label: t.label }))];

function RecordsPage() {
  const { demo, type, trigger } = Route.useSearch();
  const navigate = useNavigate({ from: "/journal" });
  const real = useEntries();
  const realIv = useInterventions();
  const rec = useRecovery();
  const { removeEntry } = real;
  const { open } = useRecordSheet();
  // 示例记录只在浏览器里生成，不写入本机记录
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  const sample = useMemo(() => (demo && now ? demoData(now) : null), [demo, now]);
  const sampleUrges = useMemo(() => (demo && now ? recoveryDemo(now).urges : null), [demo, now]);
  const entries = useMemo(
    () => (sample ? [...sample.entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : real.entries),
    [sample, real.entries],
  );
  const interventions = sample?.interventions ?? realIv.interventions;
  const ready = demo ? !!sample : real.ready && rec.ready;
  const [moodFilter, setMoodFilter] = useState<MoodKey | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const filter: Filter = type ?? "all";

  // 所有记录放进同一条时间线：日常、工作、家庭来自情绪记录；感情来自恢复模式
  const items = useMemo<Item[]>(() => {
    const list: Item[] = entries.map((e) => ({ kind: "entry", id: e.id, at: e.createdAt, type: e.record_type ?? "daily", entry: e }));
    const urges = sampleUrges ?? (demo ? [] : rec.urges);
    urges.forEach((u) => list.push({ kind: "urge", id: u.id, at: u.created_at, type: "relationship", urge: u }));
    if (!demo) {
      rec.unsent.filter((u) => !u.urge_id).forEach((u) => list.push({ kind: "unsent", id: u.id, at: u.created_at, type: "relationship", unsent: u }));
      rec.reviews.forEach((r) => list.push({ kind: "review", id: r.id, at: r.created_at, type: "relationship", review: r }));
      rec.contacts.filter((c) => !c.urge_id).forEach((c) => list.push({ kind: "contact", id: c.id, at: c.created_at, type: "relationship", contact: c }));
    }
    return list.sort((a, b) => b.at.localeCompare(a.at));
  }, [entries, sampleUrges, demo, rec.urges, rec.unsent, rec.reviews, rec.contacts]);

  const byType = items.filter((it) => filter === "all" || it.type === filter);
  const byTrigger = trigger
    ? byType.filter((it) => (it.kind === "entry" ? it.entry.triggers.includes(trigger as TriggerKey) : trigger === "intimate"))
    : byType;
  const present = MOODS.filter((m) => byTrigger.some((it) => it.kind === "entry" && it.entry.mood === m.key));
  const shown = moodFilter ? byTrigger.filter((it) => it.kind === "entry" && it.entry.mood === moodFilter) : byTrigger;
  const groups: { key: string; items: Item[] }[] = [];
  for (const it of shown) {
    const k = dayKey(new Date(it.at));
    const last = groups[groups.length - 1];
    if (last && last.key === k) last.items.push(it);
    else groups.push({ key: k, items: [it] });
  }
  const chip = (active: boolean) =>
    cn(
      "shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors",
      active ? "border-transparent bg-primary-soft font-medium text-foreground" : "border-border bg-card text-muted-foreground hover:bg-secondary",
    );
  const ivOf = (id: string) => interventions.filter((i) => i.linked_mood_record_id === id);
  const current = items.find((it) => it.id === detail) ?? null;
  const setFilter = (f: Filter) => {
    setMoodFilter(null);
    void navigate({
      search: ({ type: _old, ...rest }) => (f === "all" ? rest : { ...rest, type: f }),
      replace: true,
    });
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">记录</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {!ready
              ? "正在读取你的记录……"
              : items.length === 0
                ? "最近发生过什么？还没有记录。"
                : `最近发生过什么？${demo ? "示例共" : "一共"} ${items.length} 条，点开一条可以看到 AI 的整理和前后变化。`}
          </p>
        </div>
        {!demo && entries.length > 0 && (
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

      {demo && (
        <div className="sticky top-[4.5rem] z-20 flex items-center justify-between gap-3 rounded-2xl border border-dashed border-primary/50 bg-card/95 px-4 py-3 backdrop-blur">
          <p className="text-sm font-medium">示例数据 · 不会保存到你的记录</p>
          <Link to="/journal" className="shrink-0 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
            退出示例
          </Link>
        </div>
      )}

      {!ready && (
        <div className="space-y-3">
          <Placeholder className="h-20 w-full" />
          <Placeholder className="h-20 w-full" />
        </div>
      )}

      {ready && items.length === 0 ? (
        <div className="card-soft px-6 py-12 text-center">
          <p className="font-display text-lg">这里还很安静</p>
          <p className="mt-2 text-sm text-muted-foreground">记下第一条感受后，会按天出现在这里。</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              onClick={() => open()}
              className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)]"
            >
              记录今天的情绪
            </button>
            <Link
              to="/journal"
              search={{ demo: 1 }}
              className="rounded-full border border-border bg-card px-6 py-3 text-sm font-medium transition-colors hover:bg-secondary"
            >
              看看示例记录
            </Link>
          </div>
        </div>
      ) : (
        ready && (
          <>
            <Segmented items={FILTERS} value={filter} onChange={setFilter} label="记录类型" className="sm:max-w-lg" />

            {trigger && (
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full bg-primary-soft px-3 py-1">和「{triggerLabel(trigger)}」有关</span>
                <button
                  onClick={() => void navigate({ search: ({ trigger: _old, ...rest }) => rest, replace: true })}
                  className="text-xs text-muted-foreground underline underline-offset-4"
                >
                  清除
                </button>
              </p>
            )}

            {present.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" role="group" aria-label="按情绪筛选">
                <button onClick={() => setMoodFilter(null)} className={chip(moodFilter === null)} aria-pressed={moodFilter === null}>
                  所有情绪
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

            {shown.length === 0 && <TypeEmpty filter={filter} demo={!!demo} onDaily={() => open()} onScenario={(k) => open(undefined, k)} />}
          </>
        )
      )}

      <div className="space-y-6">
        {groups.map((g) => (
          <section key={g.key} aria-label={dayTitle(g.key)}>
            <h2 className="mb-2 flex items-baseline gap-2 px-1 text-sm font-medium">
              {dayTitle(g.key)}
              <span className="text-xs font-normal text-muted-foreground">{g.items.length} 条</span>
            </h2>
            <ul className="card-soft divide-y divide-border/70 overflow-hidden">
              {g.items.map((it) => (
                <li key={it.id}>
                  <button
                    onClick={() => setDetail(it.id)}
                    className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/50 sm:px-5"
                  >
                    <ItemRow item={it} interventions={it.kind === "entry" ? ivOf(it.id) : []} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <BottomSheet open={!!current} onClose={() => setDetail(null)} label="记录详情">
        {current?.kind === "entry" && (
          <RecordDetail
            entry={current.entry}
            history={entries.filter((e) => e.id !== current.id)}
            interventions={ivOf(current.id)}
            {...(demo
              ? {}
              : {
                  onDelete: () => {
                    removeEntry(current.id);
                    setDetail(null);
                    toast("这条记录已经删除");
                  },
                })}
          />
        )}
        {current && current.kind !== "entry" && <RelationshipDetail item={current} demo={!!demo} />}
      </BottomSheet>
    </div>
  );
}

/** 类型那一行："💼 工作 · 任务太多" */
function TypeLine({ type, event, text }: { type: RecordType; event?: string | undefined; text?: string }) {
  const t = recordTypeOf(type);
  const ev = eventOf(type, event);
  return (
    <span className="block text-xs text-muted-foreground">
      {t.emoji} {t.label}
      {text ? ` · ${text}` : ev && ev.key !== "other" ? ` · ${ev.label}` : ""}
    </span>
  );
}

function ItemRow({ item, interventions }: { item: Item; interventions: Intervention[] }) {
  const time = timeOf(item.at);
  if (item.kind === "entry") {
    const e = item.entry;
    const mood = moodOf(e.mood);
    const done = interventions[0];
    return (
      <>
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
          style={{ backgroundColor: `color-mix(in oklab, ${mood.color} 26%, white)` }}
        >
          {mood.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <TypeLine type={item.type} event={e.event} />
          <span className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
            <span className="font-medium">{mood.label}</span>
            <span className="text-xs text-muted-foreground">
              {e.intensity}/5 · {time}
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
      </>
    );
  }
  const avatar = (
    <span className="warm-card flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg" aria-hidden>
      💭
    </span>
  );
  if (item.kind === "urge") {
    const u = item.urge;
    return (
      <>
        {avatar}
        <span className="min-w-0 flex-1">
          <TypeLine type="relationship" text={u.action_taken === "contact" ? "想联系 TA，联系了" : "想联系 TA"} />
          <span className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
            <span className="font-medium">
              联系冲动 {u.urge_before}
              {u.urge_after !== undefined ? ` → ${u.urge_after}` : ""}
            </span>
            <span className="text-xs text-muted-foreground">
              {time}
              {u.triggers.length ? ` · ${u.triggers.map(urgeTriggerLabel).join("、")}` : ""}
            </span>
          </span>
          {u.unsent_text && <span className="mt-1 block truncate text-sm text-foreground/80">{u.unsent_text}</span>}
        </span>
      </>
    );
  }
  if (item.kind === "unsent") {
    return (
      <>
        {avatar}
        <span className="min-w-0 flex-1">
          <TypeLine type="relationship" text="没有发送的话" />
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {time}
            {item.unsent.emotion ? ` · ${item.unsent.emotion}` : ""}
          </span>
          <span className="mt-1 block truncate text-sm text-foreground/80">{item.unsent.content}</span>
        </span>
      </>
    );
  }
  if (item.kind === "review") {
    const r = item.review;
    return (
      <>
        {avatar}
        <span className="min-w-0 flex-1">
          <TypeLine type="relationship" text="TA 发来消息" />
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {time}
            {r.user_emotions.length ? ` · ${r.user_emotions.join("、")}` : ""}
            {r.action_choice ? ` · ${MESSAGE_ACTIONS.find((a) => a.key === r.action_choice)?.label}` : ""}
          </span>
        </span>
      </>
    );
  }
  const c = item.contact;
  return (
    <>
      {avatar}
      <span className="min-w-0 flex-1">
        <TypeLine type="relationship" text="联系了 TA" />
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {time}
          {c.triggers.length ? ` · ${c.triggers.map(urgeTriggerLabel).join("、")}` : ""}
          {c.feeling_after?.length ? ` · 之后：${c.feeling_after.join("、")}` : ""}
        </span>
      </span>
    </>
  );
}

/** 某个类型还没有记录时：说明从哪里开始记 */
function TypeEmpty({
  filter,
  demo,
  onDaily,
  onScenario,
}: {
  filter: Filter;
  demo: boolean;
  onDaily: () => void;
  onScenario: (k: "work" | "family") => void;
}) {
  const text =
    filter === "work"
      ? { title: "还没有工作相关记录", desc: SCENARIOS.work.empty }
      : filter === "family"
        ? { title: "还没有家庭相关记录", desc: SCENARIOS.family.empty }
        : filter === "relationship"
          ? { title: "还没有感情相关记录", desc: RELATIONSHIP_EMPTY }
          : { title: "没有符合条件的记录", desc: "换一个筛选看看，或者记一下现在的感受。" };
  return (
    <div className="card-soft px-6 py-10 text-center">
      <p className="font-display text-lg">{text.title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{text.desc}</p>
      {!demo &&
        (filter === "relationship" ? (
          <Link
            to="/recovery"
            className="mt-5 inline-block rounded-full border border-border bg-card px-6 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
          >
            去记录
          </Link>
        ) : (
          <button
            onClick={() => (filter === "work" || filter === "family" ? onScenario(filter) : onDaily())}
            className="mt-5 rounded-full border border-border bg-card px-6 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
          >
            去记录
          </button>
        ))}
    </div>
  );
}

/** 感情变化里的一条：只读，管理和删除在「恢复空间」 */
function RelationshipDetail({ item, demo }: { item: Exclude<Item, { kind: "entry" }>; demo: boolean }) {
  const head = (text: string) => (
    <p className="pr-10 text-xs text-muted-foreground">
      💔 感情 · {text} · {dayTitle(dayKey(new Date(item.at)))} {timeOf(item.at)}
    </p>
  );
  const manage = !demo && (
    <Link to="/recovery" className="block border-t border-border/70 pt-4 text-sm text-muted-foreground underline-offset-4 hover:underline">
      在「恢复空间」里查看和管理 →
    </Link>
  );
  if (item.kind === "urge") {
    const u = item.urge;
    const card = pauseCard({ urge: u.urge_before, triggers: u.triggers, text: u.unsent_text, ...(u.desired_response ? { desire: u.desired_response } : {}) });
    const choice = { none: "还没有选", save: "先保存，不发送", pause: "10 分钟后再决定", contact: "决定联系" }[u.action_taken];
    return (
      <div className="space-y-4">
        {head("想联系 TA")}
        <p className="font-display text-3xl font-semibold tabular-nums">
          {u.urge_before}
          {u.urge_after !== undefined ? ` → ${u.urge_after}` : ""}
          <span className="ml-2 align-middle text-sm font-normal text-muted-foreground">联系冲动</span>
        </p>
        {u.triggers.length > 0 && (
          <div className="flex flex-wrap gap-1.5 text-xs">
            {u.triggers.map((t) => (
              <span key={t} className="rounded-full bg-secondary px-2.5 py-1">
                {urgeTriggerLabel(t)}
              </span>
            ))}
          </div>
        )}
        {u.unsent_text && <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{u.unsent_text}</p>}
        <AiCard title="先帮你停一下">
          <div className="space-y-1 text-sm leading-relaxed">
            {card.lines.map((l) => (
              <p key={l}>{l}</p>
            ))}
          </div>
        </AiCard>
        <p className="text-sm text-muted-foreground">
          {u.desired_response ? `希望得到：${desireLabel(u.desired_response)} · ` : ""}当时的选择：{choice}
        </p>
        {manage}
      </div>
    );
  }
  if (item.kind === "unsent") {
    return (
      <div className="space-y-4">
        {head("没有发送的话")}
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{item.unsent.content}</p>
        <UnsentAnalysis summary={item.unsent.ai_summary} />
        {manage}
      </div>
    );
  }
  if (item.kind === "review") {
    const r = item.review;
    const facts = reviewMessage(r.original_message);
    return (
      <div className="space-y-4">
        {head("TA 发来消息")}
        <p className="rounded-2xl bg-secondary/50 px-4 py-3 text-[15px] leading-relaxed">{r.original_message}</p>
        <AiCard title="这条消息明确表达了">
          <ul className="space-y-1 text-sm">
            {facts.facts.map((f) => (
              <li key={f}>· {f}</li>
            ))}
          </ul>
        </AiCard>
        {r.user_emotions.length > 0 && <p className="text-sm text-muted-foreground">当时的感受：{r.user_emotions.join("、")}</p>}
        {manage}
      </div>
    );
  }
  const c = item.contact;
  return (
    <div className="space-y-4">
      {head("联系了 TA")}
      <p className="text-sm leading-relaxed">不需要把之前的努力清零，这里只是如实记下当时发生了什么。</p>
      {c.triggers.length > 0 && <p className="text-sm text-muted-foreground">当时：{c.triggers.map(urgeTriggerLabel).join("、")}</p>}
      {c.feeling_after && c.feeling_after.length > 0 && (
        <p className="text-sm text-muted-foreground">联系之后：{c.feeling_after.join("、")}</p>
      )}
      {manage}
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
  /** 不传时（示例记录）不显示删除 */
  onDelete?: () => void;
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
        {!onDelete ? (
          <p className="text-xs text-muted-foreground">这是一条示例记录，不会保存到你的记录。</p>
        ) : !confirm ? (
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
