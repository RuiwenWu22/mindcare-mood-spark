/**
 * 身体数据：睡眠和活动量。和情绪记录一样只存在本机。
 * - 睡眠：每天一键回答"昨晚睡得怎么样"
 * - 活动：iPhone 快捷指令读取健康数据后，通过 /sync#steps=... 带进来；也可以手动选
 * 快捷指令把数据放在链接的 # 后面，浏览器不会把这部分发给服务器；读取后立即从地址栏清除。
 */
import { dayKey, entryDay, moodOf, type Entry, type ExtraFindings } from "@/lib/mood";

export type SleepQuality = "good" | "ok" | "poor";
export type ActivityLevel = "low" | "mid" | "high";

export const SLEEP_OPTIONS: { key: SleepQuality; label: string; emoji: string }[] = [
  { key: "good", label: "不错", emoji: "😴" },
  { key: "ok", label: "一般", emoji: "😐" },
  { key: "poor", label: "很差", emoji: "😵" },
];

export const ACTIVITY_LEVELS: { key: ActivityLevel; label: string; short: string; emoji: string }[] = [
  { key: "low", label: "动得很少", short: "很少", emoji: "🛋️" },
  { key: "mid", label: "一般", short: "一般", emoji: "🚶" },
  { key: "high", label: "动得很多", short: "很多", emoji: "🏃" },
];

export const sleepOf = (k: SleepQuality) => SLEEP_OPTIONS.find((o) => o.key === k)!;
export const levelOf = (k: ActivityLevel) => ACTIVITY_LEVELS.find((o) => o.key === k)!;

export type DayLog = {
  date: string; // YYYY-MM-DD（本地日期）
  sleep?: SleepQuality;
  steps?: number;
  exercise?: number; // 锻炼分钟数
  level?: ActivityLevel; // 手动选择的活动量
  source?: "shortcut" | "manual";
  sample?: boolean;
};

/** 粗略分档：只用于和心情做对照，不作为健康建议 */
export function levelFromSteps(steps: number): ActivityLevel {
  if (steps < 4000) return "low";
  if (steps < 8000) return "mid";
  return "high";
}

export const activityLevelOf = (log?: DayLog): ActivityLevel | undefined =>
  log?.steps !== undefined ? levelFromSteps(log.steps) : log?.level;

/* ---------------- 存储 ---------------- */

const KEY = "mindcare.body.v1";
export const BODY_EVENT = "mindcare:body-changed";

function isValidLog(x: unknown): x is DayLog {
  if (!x || typeof x !== "object") return false;
  const r = x as Record<string, unknown>;
  return typeof r["date"] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r["date"]);
}

export function loadBody(): DayLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const logs = parsed.filter(isValidLog);
    // 旧版本自动填入的示例数据不再保存在本机，示例改为不落盘的演示模式
    const own = logs.filter((l) => !l.sample);
    if (own.length !== logs.length) window.localStorage.setItem(KEY, JSON.stringify(own));
    return own;
  } catch {
    return [];
  }
}

export function saveBody(logs: DayLog[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(logs));
  window.dispatchEvent(new Event(BODY_EVENT));
}

/** 写入某天的数据。如果那天是示例数据，就整条换成用户自己的，不和示例混在一起 */
export function upsertDay(date: string, patch: Omit<DayLog, "date" | "sample">) {
  const logs = loadBody();
  const i = logs.findIndex((l) => l.date === date);
  const base: DayLog = i >= 0 && !logs[i]!.sample ? logs[i]! : { date };
  const next: DayLog = { ...base, ...patch };
  if (i >= 0) logs[i] = next;
  else logs.push(next);
  saveBody(logs);
}

/** 清除某天的某一项（例如重新回答睡眠） */
export function unsetDayField(date: string, field: "sleep" | "level") {
  const logs = loadBody();
  const i = logs.findIndex((l) => l.date === date && !l.sample);
  if (i < 0) return;
  const next: DayLog = { ...logs[i]! };
  delete next[field];
  logs[i] = next;
  saveBody(logs);
}

export const clearBody = () => saveBody([]);

/* ---------------- 快捷指令同步 ---------------- */

export type SyncResult =
  | { ok: true; date: string; steps?: number; exercise?: number }
  | { ok: false; error: string };

const toNumber = (v: string | null) => {
  if (v === null) return undefined;
  const cleaned = v.replace(/[^\d.]/g, ""); // 兼容 "8,234"、"8 234 步"、"8234.0"
  if (!cleaned) return undefined;
  const n = Math.round(Number.parseFloat(cleaned));
  return Number.isFinite(n) ? n : undefined;
};

/** 解析 /sync#steps=8234&exercise=32&date=2026-09-24 */
export function parseSyncHash(hash: string, today: Date = new Date()): SyncResult {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const steps = toNumber(params.get("steps"));
  const exercise = toNumber(params.get("exercise"));
  if (steps === undefined && exercise === undefined) {
    return { ok: false, error: "链接里没有找到步数或锻炼时间。" };
  }
  if ((steps !== undefined && steps > 100_000) || (exercise !== undefined && exercise > 1440)) {
    return { ok: false, error: "这些数字看起来不太对，请检查快捷指令里的变量。" };
  }

  let date = dayKey(today);
  const rawDate = params.get("date");
  if (rawDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) return { ok: false, error: "日期格式不对，应为 YYYY-MM-DD。" };
    const earliest = new Date(today);
    earliest.setDate(earliest.getDate() - 7);
    if (rawDate > dayKey(today) || rawDate < dayKey(earliest)) {
      return { ok: false, error: "只能同步最近 7 天的数据。" };
    }
    date = rawDate;
  }
  return {
    ok: true,
    date,
    ...(steps !== undefined ? { steps } : {}),
    ...(exercise !== undefined ? { exercise } : {}),
  };
}

/* ---------------- 身体和情绪 ---------------- */

export type BodyBucket = {
  key: string;
  label: string;
  emoji: string;
  days: number;
  records: number;
  bright: number;
  neutral: number;
  heavy: number;
};

function bucketize<K extends string>(
  entries: Entry[],
  logs: DayLog[],
  options: { key: K; label: string; emoji: string }[],
  pick: (l: DayLog) => K | undefined,
): BodyBucket[] {
  const byDay = new Map<string, Entry[]>();
  for (const e of entries) {
    const k = entryDay(e);
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  }
  return options.map((o) => {
    const days = logs.filter((l) => pick(l) === o.key);
    const recs = days.flatMap((l) => byDay.get(l.date) ?? []);
    const v = recs.map((e) => moodOf(e.mood).valence);
    return {
      key: o.key,
      label: o.label,
      emoji: o.emoji,
      days: days.length,
      records: recs.length,
      bright: v.filter((x) => x === 1).length,
      neutral: v.filter((x) => x === 0).length,
      heavy: v.filter((x) => x === -1).length,
    };
  });
}

export function bodyMoodStats(entries: Entry[], logs: DayLog[]) {
  return {
    sleep: bucketize(entries, logs, SLEEP_OPTIONS, (l) => l.sleep),
    activity: bucketize(entries, logs, ACTIVITY_LEVELS, activityLevelOf),
  };
}

const share = (b: BodyBucket) => b.heavy / b.records;

/** 只有差异明显、且两边都有至少 2 条记录时，才给出结论 */
function contrast(buckets: BodyBucket[]) {
  // 比例相同时，记录多的更可信
  const usable = buckets
    .filter((b) => b.records >= 2)
    .sort((a, b) => share(b) - share(a) || b.records - a.records);
  if (usable.length < 2) return null;
  const worst = usable[0]!;
  const best = usable[usable.length - 1]!;
  return share(worst) - share(best) >= 0.4 ? { worst, best } : null;
}

/** 睡眠、活动量与心情的规律，每条都附带依据；合并进洞察页的总结 */
export function bodyFindings(entries: Entry[], logs: DayLog[]): ExtraFindings {
  const out: ExtraFindings = { sentences: [], evidence: [], suggestions: [] };
  const { sleep, activity } = bodyMoodStats(entries, logs);

  const s = contrast(sleep);
  if (s) {
    out.sentences.push(`睡得「${s.worst.label}」的日子，偏消耗的记录明显更多。`);
    out.evidence.push(
      `睡得「${s.worst.label}」的 ${s.worst.days} 天里，${s.worst.heavy}/${s.worst.records} 条记录偏消耗；睡得「${s.best.label}」的日子是 ${s.best.heavy}/${s.best.records} 条。`,
    );
    out.suggestions.push("没睡好的第二天，给自己排得松一点，先照顾好身体。");
  }
  const a = contrast(activity);
  if (a) {
    out.sentences.push(`「${a.worst.label}」的日子，偏消耗的记录更多。`);
    out.evidence.push(
      `「${a.worst.label}」的 ${a.worst.days} 天里，${a.worst.heavy}/${a.worst.records} 条记录偏消耗；「${a.best.label}」的日子是 ${a.best.heavy}/${a.best.records} 条。`,
    );
    if (a.worst.key === "low") out.suggestions.push("状态低的时候，哪怕出门走 10 分钟，也可能让你缓过来一点。");
  }
  return out;
}

/** 导出 CSV 时附带的当天睡眠和步数 */
export function csvDayInfo(logs: DayLog[]) {
  return Object.fromEntries(
    logs.map((l) => [
      l.date,
      {
        ...(l.sleep ? { sleep: sleepOf(l.sleep).label } : {}),
        ...(l.steps !== undefined ? { steps: l.steps } : {}),
      },
    ]),
  );
}
