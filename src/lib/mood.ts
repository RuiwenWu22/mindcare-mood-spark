import { hasCrisisSignal, HOTLINE } from "@/lib/safety";
import { sanitizeSong, songKey, type Song } from "@/lib/songs";

/**
 * MindCare 核心数据层
 * - 情绪定义、触发因素定义
 * - localStorage 读写
 * - 规则驱动的"AI 情绪分析"（analyzeEntries 的签名与未来接入 OpenAI 的接口保持一致）
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
  | "relationship"
  | "family"
  | "health"
  | "money"
  | "future"
  | "social"
  | "weather"
  | "alone"
  | "other";

export const TRIGGERS: { key: TriggerKey; label: string; keywords: string[] }[] = [
  {
    key: "work",
    label: "学业 / 工作",
    keywords: ["工作", "上班", "学习", "考试", "论文", "项目", "作业", "加班", "面试", "开会", "ddl", "截止", "deadline"],
  },
  {
    key: "relationship",
    label: "人际关系",
    keywords: ["朋友", "同事", "室友", "对象", "吵架", "沟通", "社交", "误会"],
  },
  { key: "family", label: "家庭", keywords: ["家人", "父母", "妈妈", "爸爸", "家里"] },
  {
    key: "health",
    label: "健康",
    keywords: ["生病", "感冒", "头疼", "胃", "身体", "失眠", "熬夜", "没睡", "睡不着", "疲惫"],
  },
  { key: "money", label: "经济", keywords: ["钱", "房租", "花销", "预算", "工资"] },
  { key: "future", label: "未来规划", keywords: ["未来", "规划", "迷茫", "选择", "方向", "读研", "求职"] },
  { key: "social", label: "社交媒体", keywords: ["刷手机", "朋友圈", "微博", "小红书", "短视频", "手机"] },
  { key: "weather", label: "天气 / 环境", keywords: ["下雨", "阴天", "天气", "太热", "太冷", "环境"] },
  { key: "alone", label: "独处时光", keywords: ["一个人", "独处", "孤独", "没人", "安静"] },
  { key: "other", label: "其他", keywords: [] },
];

/** 旧版本记录里出现过的标签，保持可读 */
const LEGACY_TRIGGER_LABELS: Record<string, string> = {
  sleep: "健康",
  deadline: "学业 / 工作",
  self: "其他",
};

export const triggerLabel = (key: string) =>
  TRIGGERS.find((t) => t.key === key)?.label ?? LEGACY_TRIGGER_LABELS[key] ?? key;


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

/** 一次自助调节前后的强度变化，用来验证"什么对我有效" */
export type FollowUp = {
  /** breathing：呼吸练习；activity：今日小计划里的一件事 */
  method: "breathing" | "activity";
  /** 具体做了什么，例如"箱式呼吸 4-4-4-4" */
  label: string;
  before: number;
  after: number;
  at: string;
};

export type Entry = {
  id: string;
  /** ISO 时间戳 */
  createdAt: string;
  mood: MoodKey;
  intensity: number; // 1-10
  note: string;
  triggers: TriggerKey[];
  /** 记录时在做什么（可选） */
  activity?: ActivityKey;
  /** 此刻的 BGM（可选，由用户主动填写） */
  song?: Song;
  /** 示例数据：首次打开时自动填入，界面上会明确标注 */
  sample?: boolean;
  followUps?: FollowUp[];
};

/** 旧版本的示例数据没有 sample 字段，用 id 前缀兜底识别 */
export const isSample = (e: Entry) => e.sample === true || e.id.startsWith("seed-");

const LEGACY_TRIGGER_KEYS: Record<string, TriggerKey> = {
  sleep: "health",
  deadline: "work",
  self: "other",
};

/** 把旧版本的触发因素 key 归一到现在的 key，并去重，避免同一标签出现两行 */
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

const daysAgo = (n: number, hour = 21) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 12, 0, 0);
  const now = Date.now();
  if (d.getTime() > now) return new Date(now - 5 * 60_000).toISOString();
  return d.toISOString();
};

export function seedEntries(): Entry[] {
  const breath = (label: string, before: number, after: number, at: string) => ({
    method: "breathing" as const,
    label,
    before,
    after,
    at,
  });
  return [
    {
      id: "seed-1",
      sample: true,
      song: { title: "晴天", artist: "周杰伦" },
      createdAt: daysAgo(0, 9),
      mood: "calm",
      intensity: 6,
      note: "早上提前二十分钟出门，路上慢慢走了一段，心里比平时安静一些。",
      triggers: ["alone"],
      activity: "commute",
    },
    {
      id: "seed-2",
      sample: true,
      song: { title: "夜空中最亮的星", artist: "逃跑计划" },
      createdAt: daysAgo(1, 22),
      mood: "anxious",
      intensity: 8,
      note: "项目的 ddl 就在这周，任务堆在一起，晚上一直睡不着。",
      triggers: ["work", "health"],
      activity: "bed",
      followUps: [breath("箱式呼吸 4-4-4-4", 8, 5, daysAgo(1, 22))],
    },
    {
      id: "seed-3",
      sample: true,
      createdAt: daysAgo(2, 20),
      mood: "stressed",
      intensity: 7,
      note: "开了一整天的会，回家什么都不想做，只想躺着。",
      triggers: ["work"],
      activity: "rest",
      followUps: [breath("箱式呼吸 4-4-4-4", 7, 5, daysAgo(2, 20))],
    },
    {
      id: "seed-6",
      sample: true,
      song: { title: "倔强", artist: "五月天" },
      createdAt: daysAgo(3, 19),
      mood: "happy",
      intensity: 7,
      note: "下班去跑了 3 公里，出了一身汗，脑子清爽了很多。",
      triggers: ["health"],
      activity: "exercise",
    },
    {
      id: "seed-7",
      sample: true,
      createdAt: daysAgo(3, 23),
      mood: "irritated",
      intensity: 6,
      note: "睡前刷了一个小时短视频，越刷越烦，也更睡不着了。",
      triggers: ["social"],
      activity: "scroll",
    },
    {
      id: "seed-4",
      sample: true,
      song: { title: "稳稳的幸福", artist: "陈奕迅" },
      createdAt: daysAgo(4, 19),
      mood: "happy",
      intensity: 7,
      note: "和朋友吃了顿饭，聊了很久，久违地笑了很多次。",
      triggers: ["relationship"],
      activity: "social",
    },
    {
      id: "seed-5",
      sample: true,
      song: { title: "后来", artist: "刘若英" },
      createdAt: daysAgo(5, 23),
      mood: "sad",
      intensity: 5,
      note: "一个人待着的时候容易想太多，有点低落，但也没什么特别的事发生。",
      triggers: ["alone", "future"],
      activity: "bed",
    },
    {
      id: "seed-8",
      sample: true,
      createdAt: daysAgo(6, 15),
      mood: "anxious",
      intensity: 6,
      note: "写报告卡住了，越想越着急，总觉得自己做得不够好。",
      triggers: ["work"],
      activity: "work",
      followUps: [breath("4-7-8 放松呼吸", 6, 5, daysAgo(6, 15))],
    },
  ];
}

export function loadEntries(): Entry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedEntries();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as Entry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((e) => {
      const { activity, song, ...rest } = e;
      const clean: Entry = { ...rest, triggers: normalizeTriggers(e.triggers ?? []) };
      if (activity && ACTIVITY_KEYS.has(activity)) clean.activity = activity;
      const safeSong = sanitizeSong(song);
      if (safeSong) clean.song = safeSong;
      return clean;
    });
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
export type CsvDayInfo = Record<string, { sleep?: string; steps?: number }>;

export function entriesToCsv(entries: Entry[], dayInfo: CsvDayInfo = {}): string {
  const header = [
    "记录时间",
    "情绪",
    "强度（1-10）",
    "心情笔记",
    "触发因素",
    "在做什么",
    "此刻的BGM",
    "当天睡眠",
    "当天步数",
    "调节记录",
    "备注",
  ];
  const rows = sortByNewest(entries).map((e) => {
    const mood = moodOf(e.mood);
    const when = new Date(e.createdAt);
    const pad = (n: number) => String(n).padStart(2, "0");
    const time = `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())} ${pad(when.getHours())}:${pad(when.getMinutes())}`;
    return [
      time,
      mood.label,
      String(e.intensity),
      e.note,
      e.triggers.map(triggerLabel).join("、"),
      e.activity ? activityOf(e.activity).label : "",
      e.song ? `《${e.song.title}》${e.song.artist ? ` ${e.song.artist}` : ""}` : "",
      dayInfo[entryDay(e)]?.sleep ?? "",
      String(dayInfo[entryDay(e)]?.steps ?? ""),
      (e.followUps ?? []).map((f) => `${f.label}后 ${f.before}→${f.after}`).join("；"),
      isSample(e) ? "示例数据" : "",
    ];
  });
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(","));
  return "\uFEFF" + lines.join("\r\n");
}

/** 触发浏览器下载 */
export function downloadCsv(entries: Entry[], dayInfo: CsvDayInfo = {}) {
  if (typeof window === "undefined" || entries.length === 0) return;
  const blob = new Blob([entriesToCsv(entries, dayInfo)], { type: "text/csv;charset=utf-8" });
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
  if (v === 1) return 50 + e.intensity * 5;
  if (v === 0) return 50;
  return 50 - e.intensity * 4.5;
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

/* ---------------- 规则版"AI 分析" ---------------- */

/** 负向情绪下，每种调节方法前后的强度变化。正向情绪的强度下降不代表"变好"，不计入 */
export type MethodStat = {
  label: string;
  method: FollowUp["method"];
  count: number;
  avgBefore: number;
  avgAfter: number;
  avgDrop: number;
  /** 全部来自示例数据 */
  sampleOnly: boolean;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export function whatWorks(entries: Entry[]): MethodStat[] {
  const acc = new Map<
    string,
    { count: number; before: number; after: number; own: number; method: FollowUp["method"] }
  >();
  for (const e of entries) {
    if (moodOf(e.mood).valence >= 0) continue;
    for (const f of e.followUps ?? []) {
      const a = acc.get(f.label) ?? { count: 0, before: 0, after: 0, own: 0, method: f.method };
      a.count += 1;
      a.before += f.before;
      a.after += f.after;
      if (!isSample(e)) a.own += 1;
      acc.set(f.label, a);
    }
  }
  return [...acc.entries()]
    .map(([label, a]) => ({
      label,
      method: a.method,
      count: a.count,
      avgBefore: round1(a.before / a.count),
      avgAfter: round1(a.after / a.count),
      avgDrop: round1((a.before - a.after) / a.count),
      sampleOnly: a.own === 0,
    }))
    .sort((x, y) => y.avgDrop - x.avgDrop || y.count - x.count);
}

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

export type Insight = {
  headline: string;
  body: string;
  suggestions: string[];
  /** "为什么这样说"：得出上面结论所依据的统计 */
  evidence: string[];
};

const slotRange = (from: number, to: number) => `${from}–${to} 点`;

/**
 * 纯前端规则生成的温和分析，每一句结论都能在 evidence 里找到对应的统计。
 * 之后接入大模型时，只需把这个函数换成服务端调用，返回同样的 Insight 结构。
 */
export function analyzeEntries(entries: Entry[], extra?: ExtraFindings): Insight {
  if (entries.length === 0) {
    return {
      headline: "还没有足够的记录",
      body: "写下第一条情绪记录后，这里会根据你的记录，慢慢总结出一些温和的观察。",
      suggestions: ["先从今天的一句话开始，不需要写得完整。"],
      evidence: [],
    };
  }

  const recent = sortByNewest(entries).slice(0, 10);
  const n = recent.length;
  const dist = moodDistribution(recent);
  const top = dist[0]!;
  const triggers = triggerRanking(recent);
  const topTrigger = triggers[0];
  const avgIntensity = round1(recent.reduce((s, e) => s + e.intensity, 0) / n);
  const heavyEntries = recent.filter((e) => moodOf(e.mood).valence === -1);
  const negRatio = heavyEntries.length / n;

  const parts: string[] = [];
  const evidence: string[] = [
    `最近 ${n} 条记录里，「${top.mood.label}」出现 ${top.count} 次（${top.percent}%），平均强度 ${avgIntensity} / 10。`,
  ];
  parts.push(
    `从你最近的 ${n} 条记录来看，出现最多的是「${top.mood.label}」，平均情绪强度在 ${avgIntensity} 左右。`,
  );
  if (topTrigger) {
    parts.push(
      `这些情绪似乎更常出现在与「${topTrigger.label}」相关的时刻，它可能是近期影响你状态的一个因素。`,
    );
    evidence.push(`「${topTrigger.label}」是出现最多的触发标签，共 ${topTrigger.count} 次。`);
  }
  evidence.push(`偏消耗的情绪（焦虑、难过、烦躁、压力很大）占 ${heavyEntries.length} / ${n} 条。`);
  if (negRatio >= 0.6) {
    parts.push("最近偏消耗的感受出现得比较密集，这通常说明你在同时扛着不少事情，而不是你不够好。");
  } else if (negRatio <= 0.25) {
    parts.push("整体上，你最近的记录里有不少让自己舒服的片刻，可以试着留意它们是怎么发生的。");
  } else {
    parts.push("你的情绪起伏看起来在正常范围内，有累的时候，也有缓过来的时候。");
  }

  // 时段规律：偏消耗的记录集中在哪个时段
  if (heavyEntries.length >= 2) {
    const bySlot = TIME_SLOTS.map((slot) => ({
      slot,
      count: heavyEntries.filter((e) => {
        const h = new Date(e.createdAt).getHours();
        return slot.from < slot.to ? h >= slot.from && h < slot.to : h >= slot.from || h < slot.to;
      }).length,
    })).sort((a, b) => b.count - a.count);
    const peak = bySlot[0]!;
    if (peak.count >= 2 && peak.count / heavyEntries.length >= 0.5) {
      parts.push(`偏消耗的感受更常出现在「${peak.slot.label}」。`);
      evidence.push(
        `${heavyEntries.length} 条偏消耗的记录里，有 ${peak.count} 条在${peak.slot.label}（${slotRange(peak.slot.from, peak.slot.to)}）。`,
      );
    }
  }

  // 场景规律：在做什么的时候更轻松 / 更消耗
  const scenes = activityStats(recent).filter((s) => s.count >= 2);
  const heavyScene = scenes.find((s) => s.heavy / s.count >= 0.6);
  const brightScene = scenes.find((s) => s.bright / s.count >= 0.6);
  if (heavyScene) {
    parts.push(`「${heavyScene.label}」的时候，偏消耗的感受占了多数。`);
    evidence.push(`场景为「${heavyScene.label}」的 ${heavyScene.count} 条记录里，${heavyScene.heavy} 条偏消耗。`);
  }
  if (brightScene) {
    parts.push(`「${brightScene.label}」时的记录大多是舒展的，值得多留意。`);
    evidence.push(`场景为「${brightScene.label}」的 ${brightScene.count} 条记录里，${brightScene.bright} 条是舒展的。`);
  }

  if (extra) {
    parts.push(...extra.sentences);
    evidence.push(...extra.evidence);
  }

  const samples = recent.filter(isSample).length;
  if (samples > 0) evidence.push(`其中 ${samples} 条是示例记录。`);

  const suggestions: string[] = [];
  if (recent.some((e) => hasCrisisSignal(e.note))) {
    suggestions.push(
      `最近的记录里有很沉重的内容。如果有伤害自己的念头，请联系信任的人，或拨打${HOTLINE.name} ${HOTLINE.number}，你不必一个人扛着。`,
    );
  }
  const best = whatWorks(entries).find((m) => m.avgDrop >= 1);
  if (best) {
    suggestions.push(
      `下次感到紧绷或低落时，可以先试试「${best.label}」：${best.sampleOnly ? "在示例记录里" : "在你的记录里"}，它平均让强度下降 ${best.avgDrop}。`,
    );
  }
  if (extra) suggestions.push(...extra.suggestions);
  if (heavyScene?.key === "bed")
    suggestions.push("睡前容易想太多时，可以试试 4-7-8 呼吸，或者先把脑子里的事写下来再睡。");
  if (heavyScene?.key === "scroll")
    suggestions.push("给刷手机设一个温和的边界，比如睡前把手机放到房间另一头。");
  const has = (k: string) => triggers.some((t) => t.key === k);
  if (has("work"))
    suggestions.push("把大任务拆成 25 分钟能完成的小步骤，每完成一步给自己一次短暂休息。");
  if (has("health")) suggestions.push("睡前 30 分钟把屏幕放远一点，用几次慢呼吸帮身体降速。");
  if (has("relationship") || has("family"))
    suggestions.push("不急着立刻回应，先把想说的写下来，明天再看一次会更清楚。");
  if (has("alone")) suggestions.push("独处时给自己一个轻的锚点：散步、听一首熟悉的歌或写三行字。");
  if (has("future")) suggestions.push("对未来的不确定，先只规划接下来一周能做的一件小事。");
  if (has("social")) suggestions.push("给刷手机设一个温和的边界，比如睡前把手机放到房间另一头。");
  if (avgIntensity >= 7) suggestions.push("情绪强度较高时，先做 2 分钟呼吸练习，再决定下一步。");
  if (suggestions.length === 0)
    suggestions.push("保持现在的节奏，每天记录一次，就已经是很好的自我照顾。");

  return {
    headline: `你最近更常感到「${top.mood.label}」`,
    body: parts.join(""),
    suggestions: Array.from(new Set(suggestions)).slice(0, 3),
    evidence,
  };
}

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
