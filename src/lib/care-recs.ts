/**
 * 记录情绪后的即时关怀推荐（纯规则，可解释）
 * - 按情绪分组：紧绷（焦虑/烦躁/压力很大）、低落（难过/一般）、舒展（开心/平静/还不错）
 * - 给出"一个首选 + 备选"，并说明为什么推荐
 * - 学习：如果历史记录里某种呼吸方式对你更有效，优先推荐它，并引用当时的数据
 * - "为什么"只引用真实拥有的信息：情绪、强度、标签、场景、过往调节效果
 */
import {
  activityOf,
  isSample,
  moodOf,
  sortByNewest,
  triggerLabel,
  type ActivityKey,
  type Entry,
  type MoodKey,
} from "@/lib/mood";
import type { AmbientId } from "@/lib/ambient";
import type { Song } from "@/lib/songs";

export type BreathPhase = { name: string; seconds: number; scale: number };

export type BreathingKey = "box" | "relax478" | "slow";

export type BreathingPlan = {
  key: BreathingKey;
  title: string;
  rhythm: string;
  desc: string;
  phases: BreathPhase[];
};

export const BREATHING_PLANS: Record<BreathingKey, BreathingPlan> = {
  box: {
    key: "box",
    title: "箱式呼吸 4-4-4-4",
    rhythm: "吸气 4 秒 · 屏息 4 秒 · 呼气 4 秒 · 停留 4 秒",
    desc: "规律等长的节奏，适合紧绷、心跳偏快的时候让身体先稳下来。",
    phases: [
      { name: "吸气", seconds: 4, scale: 1 },
      { name: "屏息", seconds: 4, scale: 1 },
      { name: "呼气", seconds: 4, scale: 0.62 },
      { name: "停留", seconds: 4, scale: 0.62 },
    ],
  },
  relax478: {
    key: "relax478",
    title: "4-7-8 放松呼吸",
    rhythm: "吸气 4 秒 · 屏息 7 秒 · 缓慢呼气 8 秒",
    desc: "呼气比吸气长，适合情绪低落或想让自己慢下来的时候。",
    phases: [
      { name: "吸气", seconds: 4, scale: 1 },
      { name: "屏息", seconds: 7, scale: 1 },
      { name: "呼气", seconds: 8, scale: 0.62 },
    ],
  },
  slow: {
    key: "slow",
    title: "2 分钟慢呼吸",
    rhythm: "吸气 4 秒 · 停留 2 秒 · 呼气 6 秒",
    desc: "温和的基础节奏，用来延续现在的放松状态。",
    phases: [
      { name: "吸气", seconds: 4, scale: 1 },
      { name: "停留", seconds: 2, scale: 1 },
      { name: "呼气", seconds: 6, scale: 0.62 },
    ],
  },
};

const PLAN_BY_TITLE = new Map(Object.values(BREATHING_PLANS).map((p) => [p.title, p]));

const PLAN_REASON: Record<BreathingKey, string> = {
  box: "规律、等长的节奏适合紧绷的时候，先让身体稳下来，再去想事情。",
  relax478: "呼气比吸气长，适合想慢下来、或者准备休息的时候。",
  slow: "温和的节奏，用来延续现在比较放松的状态。",
};

export type CareGroup = "tense" | "low" | "bright";

export type CareRecommendation = {
  group: CareGroup;
  /** 首选：负向情绪先照顾身体（呼吸），舒展时延续状态（背景声） */
  primary: "breathing" | "music";
  intro: string;
  breathing: BreathingPlan;
  music: { id: AmbientId; reason: string };
  move: { title: string; desc: string };
  /** 备选：你在心情舒展时听过的歌（来自你自己的记录） */
  song?: Song & { sampleOnly: boolean };
  /** 为什么推荐这个：每一条都来自真实数据或明确的规则 */
  why: string[];
  encouragement: string;
};

const TENSE: MoodKey[] = ["anxious", "irritated", "stressed"];
const LOW: MoodKey[] = ["sad", "neutral"];

export const groupOf = (mood: MoodKey): CareGroup =>
  TENSE.includes(mood) ? "tense" : LOW.includes(mood) ? "low" : "bright";

type PlanHistory = {
  plan: BreathingPlan;
  count: number;
  avgDrop: number;
  last: { before: number; after: number };
  sampleOnly: boolean;
};

/** 在负向情绪的历史记录里，每种呼吸方式平均让强度下降多少 */
export function breathingHistory(history: Entry[]): PlanHistory[] {
  const acc = new Map<
    BreathingKey,
    { count: number; drop: number; own: number; last: { before: number; after: number; at: string } }
  >();
  for (const e of history) {
    if (moodOf(e.mood).valence >= 0) continue;
    for (const f of e.followUps ?? []) {
      const plan = PLAN_BY_TITLE.get(f.label);
      if (!plan) continue;
      const a = acc.get(plan.key) ?? { count: 0, drop: 0, own: 0, last: { ...f } };
      a.count += 1;
      a.drop += f.before - f.after;
      if (!isSample(e)) a.own += 1;
      if (f.at >= a.last.at) a.last = { before: f.before, after: f.after, at: f.at };
      acc.set(plan.key, a);
    }
  }
  return [...acc.entries()]
    .map(([key, a]) => ({
      plan: BREATHING_PLANS[key],
      count: a.count,
      avgDrop: Math.round((a.drop / a.count) * 10) / 10,
      last: { before: a.last.before, after: a.last.after },
      sampleOnly: a.own === 0,
    }))
    .sort((x, y) => y.avgDrop - x.avgDrop || y.count - x.count);
}

function historyReason(h: PlanHistory): string {
  const caveat = h.count < 3 ? "（记录还不多，仅供参考）" : "";
  if (h.count === 1) {
    return h.sampleOnly
      ? `在示例记录里，做完「${h.plan.title}」后强度从 ${h.last.before} 降到了 ${h.last.after}${caveat}。`
      : `上次你做完「${h.plan.title}」后，强度从 ${h.last.before} 降到了 ${h.last.after}${caveat}。`;
  }
  return h.sampleOnly
    ? `在示例记录里，「${h.plan.title}」做了 ${h.count} 次，强度平均下降 ${h.avgDrop}${caveat}。`
    : `你做过 ${h.count} 次「${h.plan.title}」，强度平均下降 ${h.avgDrop}${caveat}。`;
}

/**
 * @param entry   刚保存（或最近一次）的记录
 * @param history 其他历史记录，用来学习"什么对你有效"（不含 entry 本身）
 */
export function buildRecommendation(entry: Entry, history: Entry[] = []): CareRecommendation {
  const mood = moodOf(entry.mood);
  const group = groupOf(entry.mood);
  const { intensity, triggers } = entry;
  const activity: ActivityKey | undefined = entry.activity;

  const why: string[] = [];
  let state = `你刚记录了「${mood.label} ${intensity}/10」`;
  if (triggers.length) state += `，和「${triggers.map(triggerLabel).join("、")}」有关`;
  if (activity) state += `，场景是「${activityOf(activity).label}」`;
  why.push(`${state}。`);

  // 1) 呼吸方式：先按情绪分组，再看场景，最后看个人历史
  let planKey: BreathingKey = group === "tense" ? "box" : group === "low" ? "relax478" : "slow";
  let sceneReason: string | null = null;
  if (activity === "bed" && planKey !== "relax478") {
    planKey = "relax478";
    sceneReason = "现在是睡前，推荐更舒缓、不让人兴奋的方式。";
  }
  let personal: PlanHistory | null = null;
  if (group !== "bright") {
    // 你自己的调节效果优先；自己试过但没帮助的方法，不会因为示例数据而被推荐
    const own = breathingHistory(history.filter((h) => !isSample(h)));
    const tried = new Set(own.map((h) => h.plan.key));
    const best =
      own.find((h) => h.avgDrop >= 1) ??
      breathingHistory(history.filter(isSample)).find((h) => h.avgDrop >= 1 && !tried.has(h.plan.key));
    if (best) {
      personal = best;
      planKey = best.plan.key;
    }
  }
  const breathing = BREATHING_PLANS[planKey];

  // 2) 背景声与轻运动（备选），随场景调整
  let music: CareRecommendation["music"] =
    group === "tense"
      ? { id: "rain", reason: "稳定的雨声能盖住反复打转的念头" }
      : group === "low"
        ? { id: "piano", reason: "稀疏的琴音陪着你，不催你" }
        : { id: "morning", reason: "明亮的和弦适合带着好状态继续手边的事" };
  let move: CareRecommendation["move"] =
    group === "tense"
      ? { title: "快走 10 分钟 / 甩手 1 分钟", desc: "让张力从身体里走出去，比坐着硬扛更容易松开。" }
      : group === "low"
        ? { title: "肩颈拉伸 3 分钟", desc: "坐着就能做，左右各 30 秒，慢慢转动肩膀。" }
        : { title: "散步 15 分钟", desc: "带着现在的心情走一走，留意路上的光和风。" };

  if (activity === "bed") {
    music = { id: "rain", reason: "雨声适合睡前，让脑子慢慢安静下来" };
    move = { title: "躺下前轻拉伸 3 分钟", desc: "慢慢伸展肩颈和后背，不做让心跳加快的运动。" };
  } else if (activity === "commute") {
    move = { title: "下车后多走一站路", desc: "时间允许的话，在路上多走几分钟，让身体先动起来。" };
  } else if ((activity === "work" || activity === "study") && group === "tense") {
    move = { title: "起身走两分钟，接杯水", desc: "离开座位一小会儿，比坐着硬扛更容易松开。" };
  }

  // 3) 首选与理由
  const primary: CareRecommendation["primary"] = group === "bright" ? "music" : "breathing";
  if (primary === "breathing") {
    why.push(PLAN_REASON[planKey]);
    if (personal) why.push(historyReason(personal));
    else if (sceneReason) why.push(sceneReason);
  } else {
    why.push("状态不错的时候不需要刻意调节，一段舒服的背景声能帮你把好状态延续下去。");
  }
  if (activity === "scroll" && group !== "bright") {
    why.push("刷手机时情绪容易被带着走，先把手机放下几分钟也是一种休息。");
  }

  const intro =
    group === "tense"
      ? intensity >= 7
        ? "这次的感受挺强烈的，先给身体几分钟，把节奏慢下来。"
        : "看起来有点紧绷，下面这件事只需要几分钟。"
      : group === "low"
        ? "如果现在没什么力气，就从最轻的一件开始。"
        : "状态还不错，试试把这份感觉延长一点。";

  const encouragement =
    group === "tense"
      ? "紧绷不代表你不够好，它只是说明你正扛着不少事。"
      : group === "low"
        ? "难过来的时候，先陪着它，而不是赶走它。"
        : "记下此刻具体发生了什么，之后状态低的时候可以回来看看。";

  // 紧绷或低落时，把你自己舒展时听过的歌作为备选
  let song: CareRecommendation["song"];
  if (group !== "bright") {
    const withSong = sortByNewest(history).filter((h) => h.song && moodOf(h.mood).valence === 1);
    // 你自己的歌永远优先于示例数据，不管时间先后
    const e = withSong.find((h) => !isSample(h)) ?? withSong[0];
    if (e?.song) song = { ...e.song, sampleOnly: isSample(e) };
  }

  return { group, primary, intro, breathing, music, move, ...(song ? { song } : {}), why, encouragement };
}
