/**
 * 安全兜底：在每次保存记录时运行，独立于任何推荐或（未来的）AI 逻辑。
 * - crisis：文字里出现伤害自己的信号 → 用支持卡片替换普通推荐
 * - elevated：负向情绪且强度 ≥ 9 → 普通推荐之外，温和补充求助入口
 * 关键词检测一定会有漏判和误判，这里宁可多提示一次，也不拦截保存、不制造恐慌。
 */

export type Risk = "crisis" | "elevated" | "normal";

const CRISIS_PATTERNS: RegExp[] = [
  /不想活/,
  /活不下去/,
  /活着没(有)?(意思|意义)/,
  /想死(?!你)/, // 排除“想死你了”这类口语
  /想去死/,
  /寻死/,
  /自杀/,
  /轻生/,
  /结束(自己的)?生命/,
  /(了结|结束)自己/,
  /伤害自己/,
  /自残/,
  /自伤/,
  /割腕/,
  /跳楼/,
  /不想醒来/,
  /离开这个世界/,
];

export function hasCrisisSignal(note: string): boolean {
  const text = note.replace(/\s+/g, "");
  if (!text) return false;
  return CRISIS_PATTERNS.some((p) => p.test(text));
}

export function assessRisk(input: { valence: number; intensity: number; note: string }): Risk {
  if (hasCrisisSignal(input.note)) return "crisis";
  if (input.valence < 0 && input.intensity >= 9) return "elevated";
  return "normal";
}

export const HOTLINE = {
  number: "12356",
  name: "全国统一心理援助热线",
} as const;
