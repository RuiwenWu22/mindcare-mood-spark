/**
 * 「🌿 此刻更适合你」：记录之后推荐一个主要行动（纯规则，可解释）
 * - 按情绪分组：紧绷（焦虑/烦躁/压力很大）、低落（难过/一般）、舒展（开心/平静/还不错）
 * - 一个首选 + 几种备选（换一种方式）
 * - 学习：如果你自己的调节记录显示某种方式更有效，优先推荐它，并写明依据
 */
import { moodOf, round1, type Entry, type MoodKey } from "@/lib/mood";
import type { AmbientId } from "@/lib/ambient";
import type { Intervention, InterventionType } from "@/lib/interventions";

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

/* ---------------- 可以做的事 ---------------- */

export type Step = { title: string; seconds: number; hint?: string };

export type CareAction = {
  id: string;
  kind: InterventionType;
  emoji: string;
  /** 例如"2 分钟慢呼吸"，也用作调节记录里的名字 */
  title: string;
  minutes: number;
  desc: string;
  plan?: BreathingKey;
  ambient?: AmbientId;
  steps?: Step[];
};

export const ACTIONS = {
  slow: {
    id: "slow",
    kind: "breathing",
    emoji: "🫁",
    title: "2 分钟慢呼吸",
    minutes: 2,
    desc: "吸气 4 秒 · 停留 2 秒 · 呼气 6 秒",
    plan: "slow",
  },
  box: {
    id: "box",
    kind: "breathing",
    emoji: "🫁",
    title: "箱式呼吸 4-4-4-4",
    minutes: 2,
    desc: "吸气、屏息、呼气、停留各 4 秒",
    plan: "box",
  },
  relax478: {
    id: "relax478",
    kind: "breathing",
    emoji: "🫁",
    title: "4-7-8 放松呼吸",
    minutes: 2,
    desc: "吸气 4 秒 · 屏息 7 秒 · 缓慢呼气 8 秒",
    plan: "relax478",
  },
  rain: {
    id: "rain",
    kind: "ambient",
    emoji: "🌧️",
    title: "雨声 10 分钟",
    minutes: 10,
    desc: "稳定的雨声，盖住脑子里反复打转的念头",
    ambient: "rain",
  },
  waves: {
    id: "waves",
    kind: "ambient",
    emoji: "🌊",
    title: "海浪 10 分钟",
    minutes: 10,
    desc: "缓慢起伏的海浪，适合跟着放慢呼吸",
    ambient: "waves",
  },
  piano: {
    id: "piano",
    kind: "ambient",
    emoji: "🎹",
    title: "轻柔琴音 10 分钟",
    minutes: 10,
    desc: "稀疏、缓慢的琴音，陪着你，不催你",
    ambient: "piano",
  },
  morning: {
    id: "morning",
    kind: "ambient",
    emoji: "🌤️",
    title: "清晨和弦 10 分钟",
    minutes: 10,
    desc: "明亮舒缓的和弦，适合带着好状态继续手边的事",
    ambient: "morning",
  },
  neck: {
    id: "neck",
    kind: "movement",
    emoji: "🙆",
    title: "肩颈伸展 3 分钟",
    minutes: 3,
    desc: "坐着就能做，让紧绷的肩膀先松下来",
    steps: [
      { title: "慢慢耸肩，再放下", seconds: 30, hint: "吸气时耸起，呼气时让肩膀落下" },
      { title: "头慢慢倒向左边", seconds: 30, hint: "感觉右侧脖子被拉长，不用用力" },
      { title: "头慢慢倒向右边", seconds: 30, hint: "左侧脖子被拉长" },
      { title: "肩膀向后画圈", seconds: 30, hint: "慢慢地，一圈一圈" },
      { title: "双手交叉，向前推", seconds: 30, hint: "后背拱起，像一只伸懒腰的猫" },
      { title: "闭上眼，放松三次呼吸", seconds: 30, hint: "留意身体哪里松了一点" },
    ],
  },
  walk: {
    id: "walk",
    kind: "movement",
    emoji: "🚶",
    title: "散步 10 分钟",
    minutes: 10,
    desc: "不带目的地，走的时候留意呼吸和脚步",
    steps: [{ title: "出门走一走", seconds: 600, hint: "不用看手机，回来后评一下感受" }],
  },
  bedtime: {
    id: "bedtime",
    kind: "movement",
    emoji: "😴",
    title: "睡前放松",
    minutes: 3,
    desc: "放下手机，慢慢呼吸，把这一天轻轻放下",
    steps: [
      { title: "把手机放到够不着的地方", seconds: 20, hint: "灯光也调暗一些" },
      { title: "4-7-8 呼吸，做四轮", seconds: 80, hint: "吸气 4 秒，屏息 7 秒，缓慢呼气 8 秒" },
      { title: "想一件今天值得感谢的小事", seconds: 60, hint: "哪怕很小，比如一顿好吃的饭" },
      { title: "放松身体，从头顶到脚尖", seconds: 40, hint: "一处一处地松开" },
    ],
  },
} satisfies Record<string, CareAction>;

export type ActionId = keyof typeof ACTIONS;
export const actionOf = (id: ActionId): CareAction => ACTIONS[id];
export const actionByTitle = (title: string): CareAction | undefined =>
  Object.values(ACTIONS).find((a) => a.title === title);

/* ---------------- 推荐 ---------------- */

export type CareGroup = "tense" | "low" | "bright";

const TENSE: MoodKey[] = ["anxious", "irritated", "stressed"];
const LOW: MoodKey[] = ["sad", "neutral"];

export const groupOf = (mood: MoodKey): CareGroup =>
  TENSE.includes(mood) ? "tense" : LOW.includes(mood) ? "low" : "bright";

export type CareRecommendation = {
  group: CareGroup;
  primary: CareAction;
  /** 推荐理由，一两句话 */
  reason: string;
  /** 换一种方式 */
  alternatives: CareAction[];
};

export type MethodHistory = {
  name: string;
  count: number;
  avgBefore: number;
  avgAfter: number;
  avgDrop: number;
};

/** 在负向情绪的记录上，每种方式平均让强度下降多少 */
export function methodHistory(entries: Entry[], interventions: Intervention[]): MethodHistory[] {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const acc = new Map<string, { count: number; before: number; after: number }>();
  for (const iv of interventions) {
    const e = byId.get(iv.linked_mood_record_id);
    if (!e || moodOf(e.mood).valence >= 0) continue;
    const a = acc.get(iv.intervention_name) ?? { count: 0, before: 0, after: 0 };
    a.count += 1;
    a.before += iv.before_score;
    a.after += iv.after_score;
    acc.set(iv.intervention_name, a);
  }
  return [...acc.entries()]
    .map(([name, a]) => ({
      name,
      count: a.count,
      avgBefore: round1(a.before / a.count),
      avgAfter: round1(a.after / a.count),
      avgDrop: round1((a.before - a.after) / a.count),
    }))
    .sort((x, y) => y.avgDrop - x.avgDrop || y.count - x.count);
}

const DEFAULTS: Record<CareGroup, ActionId[]> = {
  tense: ["slow", "rain", "neck", "walk"],
  low: ["relax478", "piano", "walk", "neck"],
  bright: ["morning", "walk", "slow"],
};

/**
 * @param entry         刚保存的记录
 * @param history       其他记录（不含 entry）
 * @param interventions 你自己的调节记录
 */
export function buildRecommendation(
  entry: Entry,
  history: Entry[] = [],
  interventions: Intervention[] = [],
): CareRecommendation {
  const group = groupOf(entry.mood);
  const mood = moodOf(entry.mood);
  let order: ActionId[] = [...DEFAULTS[group]];
  if (group !== "bright" && entry.activity === "bed") order = ["bedtime", ...order.filter((a) => a !== "bedtime")];

  // 你自己的调节效果优先：平均下降至少 1 分的方式排到最前面
  let personal: MethodHistory | undefined;
  if (group !== "bright") {
    personal = methodHistory(history, interventions).find((m) => m.avgDrop >= 1 && actionByTitle(m.name));
    if (personal) {
      const id = actionByTitle(personal.name)!.id as ActionId;
      order = [id, ...order.filter((a) => a !== id)];
    }
  }

  const primary = ACTIONS[order[0]!];
  let reason: string;
  if (personal) {
    reason =
      personal.count === 1
        ? `上次你做完「${personal.name}」后，强度从 ${personal.avgBefore} 降到了 ${personal.avgAfter}，可以再试试。`
        : `你做过 ${personal.count} 次「${personal.name}」，强度平均从 ${personal.avgBefore} 降到 ${personal.avgAfter}，对你似乎挺有帮助。`;
  } else if (primary.id === "bedtime") {
    reason = "现在是睡前，先让身体慢下来，比继续想事情更容易入睡。";
  } else if (group === "tense") {
    reason =
      entry.intensity >= 4
        ? "你现在的紧张程度比较高，可以先让身体慢下来，再处理让你担心的事情。"
        : `有一点${mood.label}的时候，花两分钟让呼吸慢下来，会更容易回到手边的事。`;
  } else if (group === "low") {
    reason = "呼气比吸气长的节奏，适合想让自己慢下来的时候，没什么力气也能做。";
  } else {
    reason = "状态不错的时候不需要刻意调节，一段舒服的背景声可以帮你把这份感觉延续下去。";
  }

  return {
    group,
    primary,
    reason,
    alternatives: order.slice(1).map((id) => ACTIONS[id]),
  };
}
