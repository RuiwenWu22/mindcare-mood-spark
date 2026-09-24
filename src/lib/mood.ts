import { sanitizeSong, songKey, type Song } from "@/lib/songs";
import { appendInterventions, type Intervention } from "@/lib/interventions";

/**
 * MindCare 核心数据层
 * - 情绪定义、触发因素定义
 * - localStorage 读写
 * - 统计函数（洞察页、今天页共用）
 */

export type MoodKey =
  | "happy"
  | "calm"
  | "okay"
  | "neutral"
  | "anxious"
  | "sad"
  | "irritated"
  | "stressed";

export type Mood = {
  key: MoodKey;
  emoji: string;
  label: string;
  /** 正向 1 / 中性 0 / 负向 -1，用于趋势与分析 */
  valence: 1 | 0 | -1;
  /** 图表与标签用的色彩 token */
  color: string;
};

export const MOODS: Mood[] = [
  { key: "happy", emoji: "😊", label: "开心", valence: 1, color: "var(--mood-happy)" },
  { key: "calm", emoji: "😌", label: "平静", valence: 1, color: "var(--mood-calm)" },
  { key: "okay", emoji: "🙂", label: "还不错", valence: 1, color: "var(--mood-okay)" },
  { key: "neutral", emoji: "😐", label: "一般", valence: 0, color: "var(--mood-neutral)" },
  { key: "anxious", emoji: "😟", label: "焦虑", valence: -1, color: "var(--mood-anxious)" },
  { key: "sad", emoji: "😔", label: "难过", valence: -1, color: "var(--mood-sad)" },
  { key: "irritated", emoji: "😤", label: "烦躁", valence: -1, color: "var(--mood-irritated)" },
  { key: "stressed", emoji: "😫", label: "压力很大", valence: -1, color: "var(--mood-stressed)" },
];

export const moodOf = (key: MoodKey): Mood => MOODS.find((m) => m.key === key) ?? (MOODS[3] as Mood);

export type TriggerKey =
  | "work"
  | "study"
  | "relationship"
  | "intimate"
  | "sleep"
  | "body"
  | "money"
  | "other";

/** 记录时"可能和什么有关？"的标签；keywords 用来从文字里补充识别 */
export const TRIGGERS: { key: TriggerKey; label: string; keywords: string[] }[] = [
  {
    key: "work",
    label: "工作",
    keywords: ["工作", "上班", "加班", "项目", "开会", "汇报", "老板", "领导", "同事", "客户", "ddl", "deadline", "截止", "面试", "求职"],
  },
  {
    key: "study",
    label: "学业",
    keywords: ["学习", "考试", "论文", "作业", "上课", "复习", "老师", "导师", "考研", "读研", "成绩", "期末", "答辩"],
  },
  {
    key: "relationship",
    label: "人际",
    keywords: ["朋友", "室友", "同学", "家人", "父母", "妈妈", "爸爸", "家里", "吵架", "误会", "社交", "沟通"],
  },
  {
    key: "intimate",
    label: "亲密关系",
    keywords: ["对象", "男朋友", "女朋友", "男友", "女友", "恋爱", "分手", "暧昧", "伴侣", "老公", "老婆", "喜欢的人"],
  },
  { key: "sleep", label: "睡眠", keywords: ["失眠", "睡不着", "没睡好", "熬夜", "早醒", "睡眠"] },
  { key: "body", label: "身体", keywords: ["生病", "感冒", "头疼", "头痛", "胃", "发烧", "痛经", "不舒服", "疲惫"] },
  { key: "money", label: "金钱", keywords: ["钱", "房租", "花销", "预算", "工资", "还款", "信用卡", "存款"] },
  { key: "other", label: "其他", keywords: [] },
];

/** 旧版本的标签归到现在的 8 个里 */
const LEGACY_TRIGGER_KEYS: Record<string, TriggerKey> = {
  family: "relationship",
  health: "body",
  future: "other",
  social: "other",
  weather: "other",
  alone: "other",
  deadline: "work",
  self: "other",
};

export const triggerLabel = (key: string) =>
  TRIGGERS.find((t) => t.key === (LEGACY_TRIGGER_KEYS[key] ?? key))?.label ?? key;

/* ---------------- 场景：此刻在做什么 ---------------- */
/** 灵感来自微信状态：年轻人描述自己时，常说的是"在做什么"，而不只是"感觉如何" */
export type ActivityKey =
  | "work"
  | "study"
  | "commute"
  | "social"
  | "scroll"
  | "exercise"
  | "eat"
  | "rest"
  | "bed";

export const ACTIVITIES: { key: ActivityKey; label: string; emoji: string }[] = [
  { key: "work", label: "搬砖", emoji: "💼" },
  { key: "study", label: "学习", emoji: "📚" },
  { key: "commute", label: "通勤", emoji: "🚇" },
  { key: "social", label: "和人相处", emoji: "💬" },
  { key: "scroll", label: "刷手机", emoji: "📱" },
  { key: "exercise", label: "运动", emoji: "🏃" },
  { key: "eat", label: "干饭", emoji: "🍚" },
  { key: "rest", label: "宅着", emoji: "🛋️" },
  { key: "bed", label: "睡前", emoji: "🌙" },
];

const ACTIVITY_KEYS = new Set<string>(ACTIVITIES.map((a) => a.key));
export const activityOf = (key: ActivityKey) => ACTIVITIES.find((a) => a.key === key)!;

/** 强度的满分：1–5 */
export const INTENSITY_MAX = 5;

export type Entry = {
  id: string;
  /** ISO 时间戳 */
  createdAt: string;
  mood: MoodKey;
  /** 1–5 */
  intensity: number;
  note: string;
  triggers: TriggerKey[];
  /** 记录时在做什么（可选） */
  activity?: ActivityKey;
  /** 此刻的 BGM（可选，由用户主动填写） */
  song?: Song;
  /** 旧版本自动填入的示例数据；现在读取时会被移除，示例改为不落盘的演示模式 */
  sample?: boolean;
  /** 强度量表：5 表示 1–5。旧数据（1–10）读取时会换算 */
  scale?: 5;
};

/** 旧版本存在记录里的调节结果（1–10），读取时迁移到独立的调节记录 */
type LegacyFollowUp = { method: "breathing" | "activity"; label: string; before: number; after: number; at: string };

/** 旧版本的示例数据没有 sample 字段，用 id 前缀兜底识别 */
export const isSample = (e: Entry) => e.sample === true || e.id.startsWith("seed-");

/** 把旧版本的触发因素 key 归一到现在的 key，并去重 */
function normalizeTriggers(triggers: string[]): TriggerKey[] {
  const valid = new Set<string>(TRIGGERS.map((t) => t.key));
  const out = triggers
    .map((t) => LEGACY_TRIGGER_KEYS[t] ?? t)
    .filter((t): t is TriggerKey => valid.has(t));
  return Array.from(new Set(out));
}

const STORAGE_KEY = "mindcare.entries.v1";

const pad2 = (n: number) => String(n).padStart(2, "0");
/** 本地日期键 YYYY-MM-DD，用来把记录和当天的睡眠、活动数据对上 */
export const dayKey = (d: Date = new Date()) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const entryDay = (e: Entry) => dayKey(new Date(e.createdAt));

/** 从文字里推测触发因素 */
export function detectTriggers(note: string): TriggerKey[] {
  const text = note.toLowerCase();
  return TRIGGERS.filter((t) => t.keywords.some((k) => text.includes(k.toLowerCase()))).map(
    (t) => t.key,
  );
}

/** 1–10 换算到 1–5：1-2→1，3-4→2，5-6→3，7-8→4，9-10→5 */
export const toFive = (x: unknown) => {
  const n = typeof x === "number" && Number.isFinite(x) ? x : 5;
  return Math.min(5, Math.max(1, Math.ceil(n / 2)));
};

/**
 * 读取记录，并做一次性的迁移：
 * - 移除旧版本自动填入的示例数据（示例改为不写入的演示模式）
 * - 强度从 1–10 换算到 1–5
 * - 旧的调节结果搬到独立的调节记录里
 */
export function loadEntries(): Entry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    let changed = false;
    const moved: Intervention[] = [];
    const out: Entry[] = [];
    for (const item of parsed as (Entry & { followUps?: LegacyFollowUp[] })[]) {
      if (!item || typeof item !== "object" || typeof item.id !== "string") continue;
      if (isSample(item)) {
        changed = true;
        continue;
      }
      const { activity, song, followUps, ...rest } = item;
      const old = rest.scale !== 5;
      const clean: Entry = {
        ...rest,
        intensity: old ? toFive(rest.intensity) : Math.min(5, Math.max(1, Math.round(rest.intensity) || 3)),
        triggers: normalizeTriggers(rest.triggers ?? []),
        scale: 5,
      };
      if (old || (rest.triggers ?? []).some((t) => !TRIGGERS.some((x) => x.key === t))) changed = true;
      if (activity && ACTIVITY_KEYS.has(activity)) clean.activity = activity;
      const safeSong = sanitizeSong(song);
      if (safeSong) clean.song = safeSong;
      if (Array.isArray(followUps) && followUps.length) {
        changed = true;
        followUps.forEach((f, i) =>
          moved.push({
            id: `${item.id}-f${i}`,
            intervention_type: f.method === "breathing" ? "breathing" : "activity",
            intervention_name: String(f.label),
            before_score: old ? toFive(f.before) : Math.min(5, Math.max(1, Math.round(f.before))),
            after_score: old ? toFive(f.after) : Math.min(5, Math.max(1, Math.round(f.after))),
            duration: f.method === "breathing" ? 120 : 0,
            timestamp: typeof f.at === "string" ? f.at : item.createdAt,
            linked_mood_record_id: item.id,
          }),
        );
      }
      out.push(clean);
    }
    if (changed) {
      saveEntries(out);
      appendInterventions(moved);
    }
    return out;
  } catch {
    return [];
  }
}

export function saveEntries(entries: Entry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export const sortByNewest = (entries: Entry[]) =>
  [...entries].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

/* ---------------- CSV 导出 ---------------- */

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

/** 把记录转成带 BOM 的 CSV 文本（Excel 打开中文不乱码） */
/** 导出时附带的当天身体数据（由调用方从身体数据模块整理后传入） */
/** period 只有在用户勾选"包含周期记录"时才会出现 */
export type CsvDayInfo = Record<string, { sleep?: string; steps?: number; period?: string }>;

export function entriesToCsv(entries: Entry[], dayInfo: CsvDayInfo = {}, interventions: Intervention[] = []): string {
  const header = [
    "记录时间",
    "情绪",
    "强度（1-5）",
    "心情笔记",
    "触发因素",
    "在做什么",
    "此刻的BGM",
    "当天睡眠",
    "当天步数",
    "调节记录",
    "备注",
  ];
  const withPeriod = Object.values(dayInfo).some((d) => d.period !== undefined);
  if (withPeriod) header.splice(9, 0, "周期");
  const rows = sortByNewest(entries).map((e) => {
    const mood = moodOf(e.mood);
    const when = new Date(e.createdAt);
    const pad = (n: number) => String(n).padStart(2, "0");
    const time = `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())} ${pad(when.getHours())}:${pad(when.getMinutes())}`;
    const row = [
      time,
      mood.label,
      String(e.intensity),
      e.note,
      e.triggers.map(triggerLabel).join("、"),
      e.activity ? activityOf(e.activity).label : "",
      e.song ? `《${e.song.title}》${e.song.artist ? ` ${e.song.artist}` : ""}` : "",
      dayInfo[entryDay(e)]?.sleep ?? "",
      String(dayInfo[entryDay(e)]?.steps ?? ""),
      interventions
        .filter((iv) => iv.linked_mood_record_id === e.id)
        .map((iv) => `${iv.intervention_name}后 ${iv.before_score}→${iv.after_score}`)
        .join("；"),
      "",
    ];
    if (withPeriod) row.splice(9, 0, dayInfo[entryDay(e)]?.period ?? "");
    return row;
  });
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(","));
  return "\uFEFF" + lines.join("\r\n");
}

/** 触发浏览器下载 */
export function downloadCsv(entries: Entry[], dayInfo: CsvDayInfo = {}, interventions: Intervention[] = []) {
  if (typeof window === "undefined" || entries.length === 0) return;
  const blob = new Blob([entriesToCsv(entries, dayInfo, interventions)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  a.href = url;
  a.download = `mindcare-情绪记录-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const same =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (same) return `今天 ${time}`;
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日 ${time}`;
}

/* ---------------- 统计 ---------------- */

export function lastNDays(entries: Entry[], n = 7) {
  const days: { label: string; date: Date; entries: Entry[] }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    days.push({
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      date: d,
      entries: entries.filter((e) => {
        const t = new Date(e.createdAt);
        return t >= d && t < next;
      }),
    });
  }
  return days;
}

/** 把一条记录换算成 0-100 的"状态分"：正向情绪越强分越高 */
export function entryScore(e: Entry) {
  const v = moodOf(e.mood).valence;
  if (v === 1) return 50 + e.intensity * 10;
  if (v === 0) return 50;
  return 50 - e.intensity * 9;
}

export function moodDistribution(entries: Entry[]) {
  const total = entries.length || 1;
  const counts = new Map<MoodKey, number>();
  entries.forEach((e) => counts.set(e.mood, (counts.get(e.mood) ?? 0) + 1));
  return [...counts.entries()]
    .map(([key, count]) => ({
      mood: moodOf(key),
      count,
      percent: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

export function triggerRanking(entries: Entry[]) {
  const counts = new Map<string, number>();
  entries.forEach((e) => e.triggers.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
  const max = Math.max(1, ...counts.values());
  return [...counts.entries()]
    .map(([key, count]) => ({ key, label: triggerLabel(key), count, ratio: count / max }))
    .sort((a, b) => b.count - a.count);
}

/** 每个触发因素下的情绪分布（用于堆叠条形图） */
export function triggerMoodBreakdown(entries: Entry[], topN = 5) {
  return triggerRanking(entries)
    .slice(0, topN)
    .map((t) => {
      const related = entries.filter((e) => e.triggers.includes(t.key as TriggerKey));
      const total = related.length || 1;
      const counts = new Map<MoodKey, number>();
      related.forEach((e) => counts.set(e.mood, (counts.get(e.mood) ?? 0) + 1));
      const segments = [...counts.entries()]
        .map(([key, count]) => ({
          mood: moodOf(key),
          count,
          percent: Math.round((count / total) * 100),
        }))
        .sort((a, b) => b.count - a.count);
      return { key: t.key, label: t.label, count: t.count, segments };
    });
}

export const TIME_SLOTS = [
  { key: "morning", label: "清晨", emoji: "🌅", from: 5, to: 11 },
  { key: "afternoon", label: "午后", emoji: "☀️", from: 11, to: 17 },
  { key: "evening", label: "傍晚", emoji: "🌇", from: 17, to: 23 },
  { key: "night", label: "深夜", emoji: "🌙", from: 23, to: 5 },
] as const;

/** 各时间段的平均情绪强度 */
export function timeOfDayStats(entries: Entry[]) {
  return TIME_SLOTS.map((slot) => {
    const inSlot = entries.filter((e) => {
      const h = new Date(e.createdAt).getHours();
      return slot.from < slot.to ? h >= slot.from && h < slot.to : h >= slot.from || h < slot.to;
    });
    const avg =
      inSlot.length === 0
        ? null
        : Math.round((inSlot.reduce((s, e) => s + e.intensity, 0) / inSlot.length) * 10) / 10;
    return { key: slot.key, label: slot.label, emoji: slot.emoji, count: inSlot.length, avg };
  });
}

export function weekCount(entries: Entry[]) {
  const from = new Date();
  from.setDate(from.getDate() - 6);
  from.setHours(0, 0, 0, 0);
  return entries.filter((e) => new Date(e.createdAt) >= from).length;
}

export const round1 = (n: number) => Math.round(n * 10) / 10;

export type ActivityStat = {
  key: ActivityKey;
  label: string;
  emoji: string;
  count: number;
  bright: number;
  neutral: number;
  heavy: number;
};

/** 不同场景下的情绪构成：舒展（正向）/ 一般 / 偏消耗（负向） */
export function activityStats(entries: Entry[]): ActivityStat[] {
  return ACTIVITIES.map((a) => {
    const list = entries.filter((e) => e.activity === a.key);
    const v = list.map((e) => moodOf(e.mood).valence);
    return {
      key: a.key,
      label: a.label,
      emoji: a.emoji,
      count: list.length,
      bright: v.filter((x) => x === 1).length,
      neutral: v.filter((x) => x === 0).length,
      heavy: v.filter((x) => x === -1).length,
    };
  })
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count);
}

/* ---------------- 情绪歌单 ---------------- */

export type SongStat = Song & { count: number; sampleOnly: boolean };

/** 按记录时的情绪，把歌分成"让你舒展的"和"陪你度过难受时刻的" */
export function songsByMood(entries: Entry[]): { bright: SongStat[]; heavy: SongStat[] } {
  const collect = (valence: number) => {
    const acc = new Map<string, SongStat>();
    for (const e of sortByNewest(entries)) {
      if (!e.song || moodOf(e.mood).valence !== valence) continue;
      const k = songKey(e.song);
      const cur = acc.get(k);
      if (cur) {
        cur.count += 1;
        if (!isSample(e)) cur.sampleOnly = false;
      } else acc.set(k, { ...e.song, count: 1, sampleOnly: isSample(e) });
    }
    return [...acc.values()].sort((a, b) => b.count - a.count);
  };
  return { bright: collect(1), heavy: collect(-1) };
}

/* ---------------- 规则版分析（每条结论都附依据） ---------------- */

/** 其他模块（例如睡眠和活动）得出的发现，合并进总结里，同样附带依据 */
export type ExtraFindings = { sentences: string[]; evidence: string[]; suggestions: string[] };

/* ---------------- 每日提示 ---------------- */

export const DAILY_PROMPTS = [
  "你不需要把所有事情都做好，今天完成一点点，也已经足够。",
  "情绪没有对错，它只是在告诉你，有些事需要被看见。",
  "允许自己慢下来，休息不是偷懒，是继续走下去的方式。",
  "今天愿意停下来看看自己的感受，也是在照顾自己。",
  "不必急着变好，先让自己被理解，就是一种进展。",
  "今天如果只做成一件小事，那就让它是好好吃一顿饭。",
  "把「我应该」换成「我可以」，你会轻松一点。",
  "难过来的时候，先陪着它，而不是赶走它。",
  "你不是一个人在面对这些，求助也是一种能力。",
  "深呼吸三次，把注意力放回此刻的身体上。",
];
