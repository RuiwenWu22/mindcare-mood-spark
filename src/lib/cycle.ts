/**
 * 周期记录：可选模块，默认关闭，不问性别。
 * - 只存本机，可以单独删除；导出时默认不包含
 * - 积累至少 2 个完整周期（3 次开始日期）后，才提示你自己的规律
 * - 周期变化明显时，建议就医；不做诊断
 * 只用你自己的记录，示例数据不参与。
 */
import { dayKey, entryDay, isSample, moodOf, type Entry } from "@/lib/mood";

export type Period = { start: string; end?: string }; // YYYY-MM-DD（本地日期）
export type CycleData = { enabled: boolean; periods: Period[] };

const KEY = "mindcare.cycle.v1";
export const CYCLE_EVENT = "mindcare:cycle-changed";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 两个日期相差的天数（按日历日，不受夏令时影响） */
export function daysBetween(a: string, b: string) {
  const t = (s: string) => {
    const [y, m, d] = s.split("-").map(Number) as [number, number, number];
    return Date.UTC(y, m - 1, d) / 86_400_000;
  };
  return Math.round(t(b) - t(a));
}

export function addDays(date: string, n: number) {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return dayKey(new Date(y, m - 1, d + n));
}

const byStart = (a: Period, b: Period) => a.start.localeCompare(b.start);

/* ---------------- 存储 ---------------- */

export function loadCycle(): CycleData {
  if (typeof window === "undefined") return { enabled: false, periods: [] };
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as Record<string, unknown> | null;
    if (!raw || typeof raw !== "object") return { enabled: false, periods: [] };
    const periods = (Array.isArray(raw["periods"]) ? raw["periods"] : [])
      .filter((p): p is Period => !!p && typeof p === "object" && DATE_RE.test(String((p as Period).start)))
      .map((p) => (p.end && DATE_RE.test(p.end) && p.end >= p.start ? { start: p.start, end: p.end } : { start: p.start }))
      .sort(byStart);
    return { enabled: raw["enabled"] === true, periods };
  } catch {
    return { enabled: false, periods: [] };
  }
}

export function saveCycle(data: CycleData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify({ enabled: data.enabled, periods: [...data.periods].sort(byStart) }));
  window.dispatchEvent(new Event(CYCLE_EVENT));
}

/** 关闭模块并删除全部周期数据 */
export function clearCycle() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(CYCLE_EVENT));
}

/* ---------------- 编辑（纯函数） ---------------- */

/** 没有记结束日期时，按 7 天估算，只用于判断日期是否重叠 */
const OPEN_SPAN = 7;
const lastDayOf = (p: Period) => p.end ?? addDays(p.start, OPEN_SPAN - 1);

export type EditResult = { ok: true; periods: Period[] } | { ok: false; error: string };

export function addStart(periods: Period[], date: string, today: string = dayKey()): EditResult {
  if (!DATE_RE.test(date)) return { ok: false, error: "日期格式不对。" };
  if (date > today) return { ok: false, error: "不能记录未来的日期。" };
  if (daysBetween(date, today) > 365) return { ok: false, error: "只能记录一年以内的日期。" };
  const clash = periods.find((p) => date >= p.start && date <= lastDayOf(p));
  if (clash) return { ok: false, error: `这一天已经在 ${clash.start.slice(5)} 开始的那次经期里了。` };
  return { ok: true, periods: [...periods, { start: date }].sort(byStart) };
}

/** 给最近一次还没结束的经期记上结束日期 */
export function setEnd(periods: Period[], date: string, today: string = dayKey()): EditResult {
  if (!DATE_RE.test(date)) return { ok: false, error: "日期格式不对。" };
  if (date > today) return { ok: false, error: "不能记录未来的日期。" };
  const sorted = [...periods].sort(byStart);
  const open = [...sorted].reverse().find((p) => !p.end && p.start <= date);
  if (!open) return { ok: false, error: "没有找到这天之前开始、还没结束的经期。" };
  if (daysBetween(open.start, date) > 14) return { ok: false, error: "结束日期离开始太远了，请检查一下。" };
  return { ok: true, periods: sorted.map((p) => (p === open ? { start: p.start, end: date } : p)) };
}

export const removePeriod = (periods: Period[], start: string) => periods.filter((p) => p.start !== start);

/* ---------------- 规律 ---------------- */

/** 两次开始日期之间超过这个天数，多半是中间漏记了，不参与统计 */
const MAX_COUNTED = 60;
export const MIN_CYCLES = 2;

export type CycleStats =
  | { ready: false; cycles: number; need: number }
  | {
      ready: true;
      cycles: number;
      avg: number;
      min: number;
      max: number;
      avgDays?: number; // 平均经期天数（只算记了结束日期的）
      skipped: number; // 因可能漏记而没算进来的间隔
      concerns: string[]; // 变化明显时的具体说明，非空就建议就医
      next?: string; // 按平均周期推算的下次开始日期（变化明显时不推算）
    };

export function cycleStats(periods: Period[], today: string = dayKey()): CycleStats {
  const sorted = [...periods].sort(byStart);
  const gaps: number[] = [];
  let skipped = 0;
  for (let i = 1; i < sorted.length; i++) {
    const g = daysBetween(sorted[i - 1]!.start, sorted[i]!.start);
    if (g > MAX_COUNTED) skipped++;
    else gaps.push(g);
  }
  if (gaps.length < MIN_CYCLES) return { ready: false, cycles: gaps.length, need: MIN_CYCLES - gaps.length };

  const recent = gaps.slice(-6);
  const avg = Math.round(recent.reduce((s, g) => s + g, 0) / recent.length);
  const min = Math.min(...recent);
  const max = Math.max(...recent);
  const lengths = sorted.filter((p) => p.end).map((p) => daysBetween(p.start, p.end!) + 1);
  const avgDays = lengths.length ? Math.round(lengths.reduce((s, n) => s + n, 0) / lengths.length) : undefined;

  const concerns: string[] = [];
  if (min < 21) concerns.push(`有一次周期只有 ${min} 天（常见范围大约是 21–35 天）。`);
  if (max > 35) concerns.push(`有一次周期长达 ${max} 天（常见范围大约是 21–35 天）。`);
  if (max - min > 7) concerns.push(`最近几次周期相差 ${max - min} 天，变化比较大。`);
  const long = lengths.filter((n) => n > 7);
  if (long.length) concerns.push(`有 ${long.length} 次经期超过 7 天。`);
  const last = sorted[sorted.length - 1]!;
  if (daysBetween(last.start, today) > 90) concerns.push("距离上次记录的开始日期已经超过 3 个月。");

  return {
    ready: true,
    cycles: gaps.length,
    avg,
    min,
    max,
    ...(avgDays !== undefined ? { avgDays } : {}),
    skipped,
    concerns,
    ...(concerns.length ? {} : { next: addDays(last.start, avg) }),
  };
}

/* ---------------- 周期和情绪 ---------------- */

export type Phase = "period" | "pre" | "other";
export const PHASES: { key: Phase; label: string; emoji: string }[] = [
  { key: "pre", label: "经期前 5 天", emoji: "🌘" },
  { key: "period", label: "经期", emoji: "🌑" },
  { key: "other", label: "其他日子", emoji: "🌕" },
];

/** 某天处在哪个阶段；只判断记录范围之内的日子 */
export function phaseOf(date: string, periods: Period[]): Phase | null {
  const sorted = [...periods].sort(byStart);
  if (!sorted.length || date < addDays(sorted[0]!.start, -5)) return null;
  for (const p of sorted) {
    if (date >= p.start && date <= lastDayOf(p)) return "period";
    const d = daysBetween(date, p.start);
    if (d >= 1 && d <= 5) return "pre";
  }
  return "other";
}

export type PhaseBucket = { key: Phase; label: string; emoji: string; records: number; bright: number; heavy: number };

export function phaseMoodStats(entries: Entry[], periods: Period[]): PhaseBucket[] {
  const own = entries.filter((e) => !isSample(e));
  return PHASES.map((ph) => {
    const recs = own.filter((e) => phaseOf(entryDay(e), periods) === ph.key);
    const v = recs.map((e) => moodOf(e.mood).valence);
    return {
      ...ph,
      records: recs.length,
      bright: v.filter((x) => x === 1).length,
      heavy: v.filter((x) => x === -1).length,
    };
  });
}

/** 只有周期规律已经可以提示、两边各有至少 3 条记录、且差异明显时，才给出结论 */
export function phaseFinding(entries: Entry[], periods: Period[], today: string = dayKey()) {
  if (!cycleStats(periods, today).ready) return null;
  const buckets = phaseMoodStats(entries, periods);
  const other = buckets.find((b) => b.key === "other")!;
  if (other.records < 3) return null;
  const share = (b: PhaseBucket) => b.heavy / b.records;
  const hit = buckets
    .filter((b) => b.key !== "other" && b.records >= 3 && share(b) - share(other) >= 0.3)
    .sort((a, b) => share(b) - share(a))[0];
  if (!hit) return null;
  return {
    sentence: `在你的记录里，「${hit.label}」偏消耗的记录更多。`,
    evidence: `「${hit.label}」${hit.heavy}/${hit.records} 条记录偏消耗；其他日子是 ${other.heavy}/${other.records} 条。`,
  };
}

/** 今日卡片里的一句提醒：只在规律已经稳定时出现 */
export function cycleNote(periods: Period[], today: string = dayKey()): { line: string; evidence: string } | null {
  const sorted = [...periods].sort(byStart);
  const current = sorted.find((p) => today >= p.start && today <= (p.end ?? addDays(p.start, OPEN_SPAN - 1)));
  if (current && !current.end) {
    return {
      line: "经期中，注意保暖，累了就早点休息。",
      evidence: `你记录了 ${current.start.slice(5)} 开始的经期。`,
    };
  }
  const s = cycleStats(sorted, today);
  if (!s.ready || !s.next) return null;
  const d = daysBetween(today, s.next);
  if (d < 0 || d > 3) return null;
  return {
    line: "按你记录的规律，周期可能这几天会来，给自己留一点余裕。",
    evidence: `你最近 ${Math.min(s.cycles, 6)} 个周期平均 ${s.avg} 天，按此推算大约在 ${s.next.slice(5)}；只是估算，不是预测。`,
  };
}

/** 导出时（用户勾选后）给每条记录附上当天所处的阶段 */
export function csvCycleInfo(dates: string[], periods: Period[]): Record<string, { period: string }> {
  const label = (p: Phase | null) => (p === "period" ? "经期" : p === "pre" ? "经期前 5 天" : "");
  return Object.fromEntries(dates.map((d) => [d, { period: label(phaseOf(d, periods)) }]));
}
