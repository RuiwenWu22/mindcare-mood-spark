/**
 * 洞察页的「✨ AI 本周发现」「下周可以试试」和首页的「最近的你」。
 * 目前由可解释的规则完成；每条结论都只来自最近 7 天的真实记录，
 * 数据不够时不下结论（enough = false）。
 */
import { TRIGGERS, moodOf, sortByNewest, triggerLabel, type Entry, type Mood } from "@/lib/mood";

/** 次数相同时按标签原本的顺序排，结果在任何浏览器里都一样 */
const tagIndex = (k: string) => {
  const i = TRIGGERS.findIndex((t) => t.key === k);
  return i < 0 ? 99 : i;
};
import { actionByTitle, methodHistory, type MethodHistory } from "@/lib/care-recs";
import type { Intervention } from "@/lib/interventions";

export const MIN_WEEK_RECORDS = 3;

const DAY = 86_400_000;

/** 最近 N 天的记录。页面打开后新记的记录（时间晚于 now）也算在内 */
export const inLastDays = (entries: Entry[], days: number, now: Date = new Date()) =>
  entries.filter((e) => new Date(e.createdAt).getTime() > now.getTime() - days * DAY);

/** 一天分成四段；"晚上"从 20:00 开始，和用户的直觉一致 */
export const DAY_PARTS = [
  { key: "night", label: "晚上", range: "20:00 以后", test: (h: number) => h >= 20 || h < 5 },
  { key: "morning", label: "上午", range: "5:00–12:00", test: (h: number) => h >= 5 && h < 12 },
  { key: "afternoon", label: "下午", range: "12:00–17:00", test: (h: number) => h >= 12 && h < 17 },
  { key: "evening", label: "傍晚", range: "17:00–20:00", test: (h: number) => h >= 17 && h < 20 },
] as const;

const hourOf = (e: Entry) => new Date(e.createdAt).getHours();

function topCount<K>(keys: K[]) {
  const m = new Map<K, number>();
  keys.forEach((k) => m.set(k, (m.get(k) ?? 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1])[0];
}

export type Discovery = {
  enough: boolean;
  headline: string;
  detail: string;
  /** 为什么这样判断：实际统计 */
  stats: string[];
  /** 下周建议用到的线索 */
  focus?: { label: string; part?: (typeof DAY_PARTS)[number]; trigger?: string; triggerKey?: string };
};

export function weeklyDiscovery(entries: Entry[], now: Date = new Date()): Discovery {
  const week = inLastDays(entries, 7, now);
  if (week.length < MIN_WEEK_RECORDS) {
    return {
      enough: false,
      headline: "还没有足够的记录",
      detail: "多记录几次后，MindCare 会逐渐帮助你发现自己的情绪规律。",
      stats: [`最近 7 天有 ${week.length} 条记录，至少需要 ${MIN_WEEK_RECORDS} 条才会开始总结。`],
    };
  }

  const heavy = week.filter((e) => moodOf(e.mood).valence < 0);
  const stats: string[] = [`最近 7 天共 ${week.length} 条记录，其中偏消耗的（焦虑、难过、烦躁、压力很大）${heavy.length} 条。`];

  if (heavy.length >= 2) {
    // 关注对象：出现最多的负面情绪（至少 2 次），否则看全部偏消耗的记录
    const [topMood, topMoodCount] = topCount(heavy.map((e) => e.mood))!;
    const focusMood: Mood | null = topMoodCount >= 2 ? moodOf(topMood) : null;
    const target = focusMood ? heavy.filter((e) => e.mood === focusMood.key) : heavy;
    const label = focusMood ? focusMood.label : "偏消耗的感受";
    const noun = focusMood ? `${focusMood.label}记录` : "偏消耗的记录";

    const partCounts = DAY_PARTS.map((p) => ({ p, n: target.filter((e) => p.test(hourOf(e))).length })).sort(
      (a, b) => b.n - a.n,
    );
    const peak = partCounts[0]!;
    const timed = peak.n >= 2 && peak.n / target.length >= 0.6 ? peak : null;

    const trig = topCount(target.flatMap((e) => e.triggers.filter((t) => t !== "other")));
    const trigger = trig && trig[1] >= 2 ? { key: trig[0], label: triggerLabel(trig[0]), n: trig[1] } : null;

    stats.push(
      `${target.length} 条${noun}的时间分布：${partCounts
        .filter((x) => x.n > 0)
        .map((x) => `${x.p.label}（${x.p.range}）${x.n} 条`)
        .join("，")}。`,
    );
    if (trig) stats.push(`${target.length} 条${noun}里，和「${triggerLabel(trig[0])}」有关的 ${trig[1]} 条。`);
    const avg = Math.round((target.reduce((s, e) => s + e.intensity, 0) / target.length) * 10) / 10;
    stats.push(`这些记录的平均强度是 ${avg} / 5。`);

    let headline: string;
    if (timed) headline = `你最近的${label}更容易出现在${timed.p.label}。`;
    else if (trigger && trigger.n / target.length >= 0.5) headline = `你最近的${label}，常常和「${trigger.label}」有关。`;
    else headline = `这周「${label}」出现得比较多。`;

    const parts = [`最近 7 天共有 ${target.length} 次${noun}`];
    if (timed) parts.push(`其中 ${timed.n} 次发生在${timed.p.range === "20:00 以后" ? " 20:00 以后" : timed.p.label}`);
    if (trigger) parts.push(`${trigger.n} 次与「${trigger.label}」有关`);
    const detail = `${parts.join("，")}。`;

    return {
      enough: true,
      headline,
      detail,
      stats,
      focus: {
        label,
        ...(timed ? { part: timed.p } : {}),
        ...(trigger ? { trigger: trigger.label, triggerKey: trigger.key } : {}),
      },
    };
  }

  // 大多是舒展或平淡的一周
  const bright = week.filter((e) => moodOf(e.mood).valence > 0);
  const trig = topCount(bright.flatMap((e) => e.triggers.filter((t) => t !== "other")));
  stats.push(`舒展的记录（开心、平静、还不错）${bright.length} 条。`);
  if (trig && trig[1] >= 2) {
    stats.push(`舒展的记录里，和「${triggerLabel(trig[0])}」有关的 ${trig[1]} 条。`);
    return {
      enough: true,
      headline: `和「${triggerLabel(trig[0])}」有关的时刻，你常常感觉不错。`,
      detail: `最近 7 天有 ${bright.length} 条舒展的记录，其中 ${trig[1]} 条和「${triggerLabel(trig[0])}」有关。`,
      stats,
    };
  }
  return {
    enough: true,
    headline: bright.length >= week.length / 2 ? "这周你的记录大多是舒展的。" : "这周你的情绪比较平稳。",
    detail: `最近 7 天共 ${week.length} 条记录，偏消耗的只有 ${heavy.length} 条。`,
    stats,
  };
}

/* ---------------- 什么对我有效 ---------------- */

/** 洞察页和关怀页共用：按平均下降排序；只统计负面情绪下做的调节 */
export const whatWorks = (entries: Entry[], interventions: Intervention[]): MethodHistory[] =>
  methodHistory(entries, interventions);

/* ---------------- 下周可以试试 ---------------- */

const TRIGGER_TIPS: Record<string, string> = {
  work: "工作让你紧绷的时候，可以试试把最难的一件事拆成 25 分钟的小步骤。",
  study: "学业压力大的时候，可以试试只定下明天最重要的一件事，其余的先放一放。",
  relationship: "和人有摩擦的时候，可以试试先把想说的话写下来，第二天再决定要不要说。",
  intimate: "亲密关系让你不安的时候，可以试试先照顾好自己的情绪，再去沟通。",
  sleep: "没睡好的第二天，可以试试把安排放松一点，睡前 30 分钟把手机放远一些。",
  body: "身体不舒服的时候，可以试试先休息，不急着处理情绪。",
  money: "为钱担心的时候，可以试试把这周的开销写下来，不确定感会小一点。",
};

export function nextWeekTips(d: Discovery, methods: MethodHistory[]): string[] {
  if (!d.enough) return [];
  const tips: string[] = [];
  const best = methods.find((m) => m.avgDrop >= 1 && m.count >= 1);
  const f = d.focus;
  if (f) {
    const when = f.part ? `如果${f.part.label}再次出现${f.label}` : `下次感到${f.label}的时候`;
    const then = f.trigger ? `再继续处理「${f.trigger}」的事` : "再决定下一步";
    if (best) tips.push(`${when}，可以试试先做「${best.name}」，${then}。`);
    else tips.push(`${when}，可以试试先做 2 分钟慢呼吸，${then}；做完评一下，看看它对你有没有帮助。`);
    if (f.triggerKey && TRIGGER_TIPS[f.triggerKey]) tips.push(TRIGGER_TIPS[f.triggerKey]!);
    if (f.part?.key === "night") tips.push("晚上容易想太多的话，可以试试睡前放松，或者先把脑子里的事写下来再睡。");
  } else if (best) {
    tips.push(`状态低的时候，可以继续试试「${best.name}」——在你的记录里，它平均让强度下降 ${best.avgDrop}。`);
  } else {
    tips.push("可以试试留意一下，是什么让这周的你感觉不错，把它安排进下周。");
  }
  return Array.from(new Set(tips)).slice(0, 3);
}

/* ---------------- 最近的你（首页底部） ---------------- */

export function recentYou(entries: Entry[], now: Date = new Date()) {
  const week = inLastDays(entries, 7, now);
  const mood = topCount(week.map((e) => e.mood));
  const trig = topCount(week.flatMap((e) => e.triggers.filter((t) => t !== "other")));
  return {
    count: week.length,
    topMood: mood ? moodOf(mood[0]) : null,
    topTrigger: trig ? triggerLabel(trig[0]) : null,
  };
}

/** 最近一条记录之后，做过的调节（首页"今天的记录"用） */
export function latestWithIntervention(entries: Entry[], interventions: Intervention[]) {
  const latest = sortByNewest(entries)[0];
  if (!latest) return null;
  const done = interventions
    .filter((i) => i.linked_mood_record_id === latest.id)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
  return { entry: latest, intervention: done ?? null, action: done ? actionByTitle(done.intervention_name) : undefined };
}

/* ---------------- 常见的触发因素：✨ AI 发现 ---------------- */

/** 记录少于这么多条时，用更克制的说法 */
export const TRIGGER_CONFIDENT_MIN = 8;

export type TriggerStat = {
  key: string;
  label: string;
  count: number;
  bright: number;
  neutral: number;
  heavy: number;
  /** 按情绪列出次数，顺序和 MOODS 一致（舒展 → 一般 → 偏消耗） */
  moods: { mood: Mood; count: number }[];
};

export function triggerStats(entries: Entry[]): TriggerStat[] {
  const acc = new Map<string, Entry[]>();
  for (const e of entries) for (const t of e.triggers) acc.set(t, [...(acc.get(t) ?? []), e]);
  const order = (m: Mood) => ["happy", "calm", "okay", "neutral", "anxious", "sad", "irritated", "stressed"].indexOf(m.key);
  return [...acc.entries()]
    .map(([key, list]) => {
      const byMood = new Map<string, number>();
      list.forEach((e) => byMood.set(e.mood, (byMood.get(e.mood) ?? 0) + 1));
      const v = list.map((e) => moodOf(e.mood).valence);
      return {
        key,
        label: triggerLabel(key),
        count: list.length,
        bright: v.filter((x) => x > 0).length,
        neutral: v.filter((x) => x === 0).length,
        heavy: v.filter((x) => x < 0).length,
        moods: [...byMood.entries()]
          .map(([k, count]) => ({ mood: moodOf(k as Entry["mood"]), count }))
          .sort((a, b) => order(a.mood) - order(b.mood)),
      };
    })
    .sort((a, b) => b.count - a.count || tagIndex(a.key) - tagIndex(b.key));
}

export function triggerInsight(entries: Entry[]): { text: string; evidence: string[] } | null {
  const stats = triggerStats(entries);
  const top = stats[0];
  if (!top) return null;
  const tied = stats.filter((s) => s.count === top.count);
  const evidence = [
    `共 ${entries.length} 条记录，其中 ${entries.filter((e) => e.triggers.length).length} 条选了原因标签。`,
    ...stats.slice(0, 5).map(
      (s) => `「${s.label}」${s.count} 次：${s.moods.map((m) => `${m.mood.label} ${m.count}`).join("、")}。`,
    ),
  ];
  const names = tied.map((s) => `「${s.label}」`).join("和");

  if (entries.length < TRIGGER_CONFIDENT_MIN || tied.length > 1) {
    evidence.push(`记录少于 ${TRIGGER_CONFIDENT_MIN} 条，或几个原因次数一样多时，只做初步观察。`);
    return {
      text: `目前${names}出现得相对更多，不过记录还比较少，再记录几次后会更容易看出规律。`,
      evidence,
    };
  }

  let mood = "情绪有起有落。";
  if (top.heavy === top.count) mood = "而且这些记录都伴随着偏消耗状态。";
  else if (top.heavy / top.count >= 0.6) mood = `其中 ${top.heavy} 次是偏消耗的。`;
  else if (top.bright / top.count >= 0.6) mood = "而且多数时候你的状态是舒展的。";
  return {
    text: `「${top.label}」目前是出现最多的情绪触发因素，共记录 ${top.count} 次，${mood}`,
    evidence,
  };
}
