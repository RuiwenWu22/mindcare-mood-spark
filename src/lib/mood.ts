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


export type Entry = {
  id: string;
  /** ISO 时间戳 */
  createdAt: string;
  mood: MoodKey;
  intensity: number; // 1-10
  note: string;
  triggers: TriggerKey[];
};

const STORAGE_KEY = "mindcare.entries.v1";

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
  return d.toISOString();
};

export function seedEntries(): Entry[] {
  return [
    {
      id: "seed-1",
      createdAt: daysAgo(0, 9),
      mood: "calm",
      intensity: 6,
      note: "早上提前二十分钟出门，路上慢慢走了一段，心里比平时安静一些。",
      triggers: ["alone"],
    },
    {
      id: "seed-2",
      createdAt: daysAgo(1, 22),
      mood: "anxious",
      intensity: 8,
      note: "项目的 ddl 就在这周，任务堆在一起，晚上一直睡不着。",
      triggers: ["work", "health"],
    },
    {
      id: "seed-3",
      createdAt: daysAgo(2, 20),
      mood: "stressed",
      intensity: 7,
      note: "开了一整天的会，回家什么都不想做，只想躺着。",
      triggers: ["work"],
    },
    {
      id: "seed-4",
      createdAt: daysAgo(4, 19),
      mood: "happy",
      intensity: 7,
      note: "和朋友吃了顿饭，聊了很久，久违地笑了很多次。",
      triggers: ["relationship"],
    },
    {
      id: "seed-5",
      createdAt: daysAgo(5, 23),
      mood: "sad",
      intensity: 5,
      note: "一个人待着的时候容易想太多，有点低落，但也没什么特别的事发生。",
      triggers: ["alone", "future"],
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
    return Array.isArray(parsed) ? parsed : [];
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
export function entriesToCsv(entries: Entry[]): string {
  const header = ["记录时间", "情绪", "强度（1-10）", "心情笔记", "触发因素"];
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
    ];
  });
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(","));
  return "\uFEFF" + lines.join("\r\n");
}

/** 触发浏览器下载 */
export function downloadCsv(entries: Entry[]) {
  if (typeof window === "undefined" || entries.length === 0) return;
  const blob = new Blob([entriesToCsv(entries)], { type: "text/csv;charset=utf-8" });
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

export function weekCount(entries: Entry[]) {
  const from = new Date();
  from.setDate(from.getDate() - 6);
  from.setHours(0, 0, 0, 0);
  return entries.filter((e) => new Date(e.createdAt) >= from).length;
}

/* ---------------- 规则版"AI 分析" ---------------- */

export type Insight = { headline: string; body: string; suggestions: string[] };

/**
 * 纯前端规则生成的温和分析。
 * 之后接入 OpenAI 时，只需把这个函数换成 async 的服务端调用，返回同样的 Insight 结构。
 */
export function analyzeEntries(entries: Entry[]): Insight {
  if (entries.length === 0) {
    return {
      headline: "还没有足够的记录",
      body: "写下第一条情绪记录后，这里会根据你的记录，慢慢总结出一些温和的观察。",
      suggestions: ["先从今天的一句话开始，不需要写得完整。"],
    };
  }

  const recent = sortByNewest(entries).slice(0, 10);
  const dist = moodDistribution(recent);
  const top = dist[0]!;
  const triggers = triggerRanking(recent);
  const topTrigger = triggers[0];
  const avgIntensity =
    Math.round((recent.reduce((s, e) => s + e.intensity, 0) / recent.length) * 10) / 10;
  const negative = recent.filter((e) => moodOf(e.mood).valence === -1).length;
  const negRatio = negative / recent.length;

  const parts: string[] = [];
  parts.push(
    `从你最近的 ${recent.length} 条记录来看，出现最多的是「${top.mood.label}」，大约占 ${top.percent}%，平均情绪强度在 ${avgIntensity} 左右。`,
  );
  if (topTrigger) {
    parts.push(
      `这些情绪似乎更常出现在与「${topTrigger.label}」相关的时刻，它可能是近期影响你状态的一个因素。`,
    );
  }
  if (negRatio >= 0.6) {
    parts.push("最近偏消耗的感受出现得比较密集，这通常说明你在同时扛着不少事情，而不是你不够好。");
  } else if (negRatio <= 0.25) {
    parts.push("整体上，你最近的记录里有不少让自己舒服的片刻，可以试着留意它们是怎么发生的。");
  } else {
    parts.push("你的情绪起伏看起来在正常范围内，有累的时候，也有缓过来的时候。");
  }

  const suggestions: string[] = [];
  const has = (k: string) => triggers.some((t) => t.key === k);
  if (has("deadline") || has("work"))
    suggestions.push("把大任务拆成 25 分钟能完成的小步骤，每完成一步给自己一次短暂休息。");
  if (has("sleep")) suggestions.push("睡前 30 分钟把屏幕放远一点，用几次慢呼吸帮身体降速。");
  if (has("relationship"))
    suggestions.push("不急着立刻回应，先把想说的写下来，明天再看一次会更清楚。");
  if (has("alone")) suggestions.push("独处时给自己一个轻的锚点：散步、听一首熟悉的歌或写三行字。");
  if (has("self")) suggestions.push("试着把「我应该」换成「我可以」，今天只完成一件小事也算数。");
  if (avgIntensity >= 7) suggestions.push("情绪强度较高时，先做 2 分钟呼吸练习，再决定下一步。");
  if (suggestions.length === 0)
    suggestions.push("保持现在的节奏，每天记录一次，就已经是很好的自我照顾。");

  return {
    headline: `你最近更常感到「${top.mood.label}」`,
    body: parts.join(""),
    suggestions: suggestions.slice(0, 3),
  };
}

/* ---------------- 每日提示 ---------------- */

export const DAILY_PROMPTS = [
  "你不需要把所有事情都做好，今天完成一点点，也已经足够。",
  "情绪没有对错，它只是在告诉你，有些事需要被看见。",
  "允许自己慢下来，休息不是偷懒，是继续走下去的方式。",
  "你已经比昨天多撑过了一天，这本身就值得被肯定。",
  "不必急着变好，先让自己被理解，就是一种进展。",
  "今天如果只做成一件小事，那就让它是好好吃一顿饭。",
  "把「我应该」换成「我可以」，你会轻松一点。",
  "难过来的时候，先陪着它，而不是赶走它。",
  "你不是一个人在面对这些，求助也是一种能力。",
  "深呼吸三次，把注意力放回此刻的身体上。",
];
