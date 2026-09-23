/**
 * 记录情绪后的即时关怀推荐
 * 按情绪分组：紧绷（焦虑/烦躁/压力很大）、低落（难过/一般）、舒展（开心/平静/还不错）
 */
import type { MoodKey } from "@/lib/mood";
import type { AmbientId } from "@/lib/ambient";

export type BreathPhase = { name: string; seconds: number; scale: number };

export type BreathingPlan = {
  title: string;
  rhythm: string;
  desc: string;
  phases: BreathPhase[];
};

export type CareRecommendation = {
  group: "tense" | "low" | "bright";
  intro: string;
  breathing: BreathingPlan;
  music: { id: AmbientId; reason: string };
  move: { title: string; desc: string };
  encouragement: string;
};

export const BREATHING_PLANS: Record<string, BreathingPlan> = {
  box: {
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

const TENSE: MoodKey[] = ["anxious", "irritated", "stressed"];
const LOW: MoodKey[] = ["sad", "neutral"];

export function recommendFor(mood: MoodKey, intensity = 5): CareRecommendation {
  if (TENSE.includes(mood)) {
    return {
      group: "tense",
      intro:
        intensity >= 7
          ? "这次的感受挺强烈的，先给身体几分钟，把节奏慢下来。"
          : "看起来有点紧绷，下面这几件事都只需要几分钟。",
      breathing: BREATHING_PLANS["box"]!,
      music: { id: "rain", reason: "稳定的雨声能盖住反复打转的念头" },
      move: { title: "快走 10 分钟 / 甩手 1 分钟", desc: "让张力从身体里走出去，比坐着硬扛更容易松开。" },
      encouragement: "紧绷不代表你不够好，它只是说明你正扛着不少事。",
    };
  }
  if (LOW.includes(mood)) {
    return {
      group: "low",
      intro: "如果现在没什么力气，就从最轻的一件开始。",
      breathing: BREATHING_PLANS["relax478"]!,
      music: { id: "piano", reason: "稀疏的琴音陪着你，不催你" },
      move: { title: "肩颈拉伸 3 分钟", desc: "坐着就能做，左右各 30 秒，慢慢转动肩膀。" },
      encouragement: "难过来的时候，先陪着它，而不是赶走它。",
    };
  }
  return {
    group: "bright",
    intro: "状态还不错，试试把这份感觉延长一点。",
    breathing: BREATHING_PLANS["slow"]!,
    music: { id: "morning", reason: "明亮的和弦适合带着好状态继续手边的事" },
    move: { title: "散步 15 分钟", desc: "带着现在的心情走一走，留意路上的光和风。" },
    encouragement: "记下此刻具体发生了什么，之后状态低的时候可以回来看看。",
  };
}
